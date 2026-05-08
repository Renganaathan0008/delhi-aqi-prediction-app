"""
train.py — Train and compare 4 models on Delhi AQI data, save best as model.pkl

Usage:
    python train.py

Expects: backend/delhi.csv with columns:
    datetime, station, PM2.5, PM10, NO2, CO, SO2, Temperature, Humidity, Wind Speed, AQI
"""

import pickle, warnings
import numpy as np
import pandas as pd

# ASSERT: shap library importable before saving
try:
    import shap
    print("✓ shap importable")
except ImportError:
    raise ImportError("shap not installed. Run: pip install shap==0.45.1")

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    print("WARNING: xgboost not installed — skipping XGBoost")
    HAS_XGB = False

try:
    from lightgbm import LGBMRegressor
    HAS_LGB = True
except ImportError:
    print("WARNING: lightgbm not installed — skipping LightGBM")
    HAS_LGB = False

# ── Feature list (order matters — must match app.py FEATURES) ─────────────────
FEATURES = [
    'PM2.5', 'PM10', 'NO2', 'CO', 'SO2',
    'Temperature', 'Humidity', 'Wind Speed',
    'hour', 'month', 'season', 'is_winter', 'is_peak_hour'
]
# ASSERT: all 13 features present in saved model
assert len(FEATURES) == 13, "Expected 13 features"

# ── Season helper ─────────────────────────────────────────────────────────────
def get_season(month):
    """0=Winter(DJF), 1=Pre-Monsoon(MAM), 2=Monsoon(JJA), 3=Post-Monsoon(SON)"""
    if month in (12, 1, 2): return 0
    if month in (3, 4, 5):  return 1
    if month in (6, 7, 8):  return 2
    return 3

# ── Load data ─────────────────────────────────────────────────────────────────
print("Loading delhi.csv …")
df = pd.read_csv('delhi.csv')
print(f"  Raw rows: {len(df)}")

# ── Drop target-encoding columns before any feature work ─────────────────────
df = df.drop(columns=[c for c in df.columns
                       if c.lower() in ('aqi_category', 'aqi_cat')], errors='ignore')

# Drop rows where AQI is null
df = df.dropna(subset=['AQI'])
print(f"  Rows after dropping null AQI: {len(df)}")

# Parse datetime
df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')
df = df.dropna(subset=['datetime'])

# ── Engineered features ───────────────────────────────────────────────────────
df['hour']         = df['datetime'].dt.hour                            # 0–23
df['month']        = df['datetime'].dt.month                           # 1–12
df['season']       = df['month'].apply(get_season)                     # 0–3
df['is_winter']    = (df['season'] == 0).astype(int)                   # bool as int
df['is_peak_hour'] = df['hour'].apply(
    lambda h: int((7 <= h <= 10) or (18 <= h <= 22))                   # bool as int
)

# Fill SO2 if missing (column required in features)
if 'SO2' not in df.columns:
    print("  WARNING: SO2 column missing — filling with 0")
    df['SO2'] = 0.0
else:
    df['SO2'] = df['SO2'].fillna(0.0)

# Fill remaining feature NaNs with median
for col in FEATURES:
    if df[col].isnull().any():
        df[col] = df[col].fillna(df[col].median())

print(f"  Final dataset: {len(df)} rows × {len(FEATURES)} features")

# ── Train/test split — chronological (no shuffle) ─────────────────────────────
df = df.sort_values('datetime').reset_index(drop=True)
split_idx         = int(len(df) * 0.8)
df_train, df_test = df.iloc[:split_idx].copy(), df.iloc[split_idx:].copy()
split_date        = df.iloc[split_idx]['datetime'].strftime('%Y-%m-%d %H:%M')

X_train = df_train[FEATURES].values.astype(float)
y_train = df_train['AQI'].values.astype(float)
X_test  = df_test[FEATURES].values.astype(float)
y_test  = df_test['AQI'].values.astype(float)

print(f"  Split boundary : {split_date}")
print(f"  Train rows     : {len(X_train)}  |  Test rows: {len(X_test)}")

# ── Lag features — per partition to prevent leakage ───────────────────────────
for part in (df_train, df_test):
    part.sort_values(['station', 'datetime'], inplace=True)

train_lag_medians = {}
for col in ['PM2.5', 'PM10']:
    lag_col = f'{col}_lag3'
    train_lag_medians[lag_col] = df_train[col].median()
    df_train[lag_col] = (
        df_train.groupby('station')[col]
        .transform(lambda x: x.shift(3))
        .fillna(train_lag_medians[lag_col])
    )
    df_test[lag_col] = (
        df_test.groupby('station')[col]
        .transform(lambda x: x.shift(3))
        .fillna(train_lag_medians[lag_col])  # train median — no test leakage
    )

df_train = df_train.sort_values('datetime').reset_index(drop=True)
df_test  = df_test.sort_values('datetime').reset_index(drop=True)

FEATURES.extend(['PM2.5_lag3', 'PM10_lag3'])

X_train = df_train[FEATURES].values.astype(float)
y_train = df_train['AQI'].values.astype(float)
X_test  = df_test[FEATURES].values.astype(float)
y_test  = df_test['AQI'].values.astype(float)

print(f"  Features after lag : {len(FEATURES)}  {FEATURES}")

# ── Scale (fit on train only — used by linear models) ─────────────────────────
scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

LINEAR = {'LinearRegression', 'Ridge'}

# ── Model definitions ─────────────────────────────────────────────────────────
models = {
    'LinearRegression': LinearRegression(n_jobs=-1),
    'Ridge':            Ridge(alpha=10.0),
    'RandomForest': RandomForestRegressor(
        n_estimators=200, max_depth=15, min_samples_leaf=2,
        n_jobs=-1, random_state=42
    ),
    'GradientBoosting': GradientBoostingRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        random_state=42
    ),
}
if HAS_XGB:
    models['XGBoost'] = XGBRegressor(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbosity=0, n_jobs=-1
    )
if HAS_LGB:
    models['LightGBM'] = LGBMRegressor(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1, verbose=-1
    )

# ── Train & evaluate ──────────────────────────────────────────────────────────
results = {}
print("\n{'Model':<20} {'RMSE':>8} {'MAE':>8} {'R²':>8}")
print("-" * 48)

for name, model in models.items():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        Xtr = X_train_s if name in LINEAR else X_train
        Xte = X_test_s  if name in LINEAR else X_test
        model.fit(Xtr, y_train)
    preds = np.clip(model.predict(Xte), 0, 500)
    rmse  = float(np.sqrt(mean_squared_error(y_test, preds)))
    mae   = float(mean_absolute_error(y_test, preds))
    r2    = float(r2_score(y_test, preds))
    results[name] = {'model': model, 'rmse': rmse, 'mae': mae, 'r2': r2,
                     'uses_scaler': name in LINEAR}
    print(f"{name:<20} {rmse:>8.2f} {mae:>8.2f} {r2:>8.4f}")

# ── Pick best model (highest R²) ─────────────────────────────────────────────
best_name = max(results, key=lambda k: results[k]['r2'])
best      = results[best_name]
print(f"\n✓ Best model: {best_name}  (R²={best['r2']:.4f}, RMSE={best['rmse']:.2f})")

# ASSERT: R² > 0.85 else warn
if best['r2'] < 0.85:
    print("WARNING: Model underfit — check for data leakage or feature issues")

# ASSERT: flag suspiciously perfect R²
if best['r2'] > 0.999:
    print(f"WARNING: R²≈1 ({best['r2']:.6f}) — likely data leakage or deterministic target. Inspect feature set.")

# ASSERT: feature_importances_ shows >1 feature with importance >0.01
fi = best['model'].feature_importances_
n_important = sum(1 for v in fi if v > 0.01)
assert n_important > 1, "Only 1 feature with importance >0.01 — possible data issue"
print(f"✓ Features with importance >0.01: {n_important}")

# ── Build API cache from train partition only ─────────────────────────────────
print("\nBuilding API cache from train partition …")

df_train['date_str'] = df_train['datetime'].dt.strftime('%Y-%m-%d')

# 30-day daily average AQI per station (train only)
trend      = {}
trend_meta = {}
for station, grp in df_train.groupby('station'):
    daily = (
        grp.groupby('date_str')['AQI']
        .mean().round(1).tail(30)
        .reset_index()
        .rename(columns={'date_str': 'label', 'AQI': 'AQI'})
    )
    trend[station] = daily.to_dict('records')
    if len(daily):
        trend_meta[station] = {
            'date_from': daily['label'].iloc[0],
            'date_to':   daily['label'].iloc[-1],
        }

# Latest snapshot per station — last row from full df
RAW_COLS    = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'Temperature', 'Humidity', 'Wind Speed']
latest_rows = df.sort_values('datetime').groupby('station').last().reset_index()
keep_cols   = ['station'] + [c for c in RAW_COLS if c in latest_rows.columns] + ['AQI']
latest      = latest_rows[keep_cols].to_dict('records')

# Hourly AQI profile from train partition only
hourly = (
    df_train.groupby('hour')['AQI']
    .mean().round(1)
    .reset_index()
    .rename(columns={'hour': 'hour', 'AQI': 'avg_aqi'})
    .to_dict('records')
)

station_list = sorted(df['station'].unique().tolist())
comparison   = {
    name: {'rmse': round(v['rmse'], 4), 'mae': round(v['mae'], 4), 'r2': round(v['r2'], 4)}
    for name, v in results.items()
}

print(f"  {len(station_list)} stations · {len(latest)} snapshots · hourly points: {len(hourly)}")

# ── Global SHAP summary (mean |SHAP| per feature, train sample) ───────────────
print("\nComputing global SHAP summary …")
explainer = shap.TreeExplainer(best['model'])
sample_size  = min(500, len(X_train))
rng          = np.random.default_rng(42)
sample_idx   = rng.choice(len(X_train), sample_size, replace=False)
shap_values  = explainer.shap_values(X_train[sample_idx])
mean_abs_shap = np.abs(shap_values).mean(axis=0)
global_shap  = {f: round(float(mean_abs_shap[i]), 4) for i, f in enumerate(FEATURES)}
print(f"  Global SHAP computed on {sample_size} train samples")
print(f"  Top 3 features: {sorted(global_shap, key=global_shap.get, reverse=True)[:3]}")

# ── Correlation matrix (pollutants + meteorological vs AQI) ───────────────────
print("\nComputing correlation matrix …")
corr_cols = ['PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'Temperature', 'Humidity', 'Wind Speed', 'AQI']
corr_cols = [c for c in corr_cols if c in df.columns]
corr_df   = df[corr_cols].dropna()
corr_mat  = corr_df.corr(method='pearson').round(3)
# Store as list-of-records for easy JSON serialisation
correlation = {
    'features': corr_cols,
    'matrix':   corr_mat.values.tolist(),
    'aqi_row':  {c: round(float(corr_mat.loc['AQI', c]), 3) for c in corr_cols if c != 'AQI'},
}
print(f"  Pearson correlation matrix: {len(corr_cols)}×{len(corr_cols)}")

# ── Save ──────────────────────────────────────────────────────────────────────
from datetime import datetime as _dt
artifact = {
    'model':          best['model'],
    'features':       FEATURES,
    'model_name':     best_name,
    'rmse':           best['rmse'],
    'r2':             best['r2'],
    'mae':            best['mae'],
    'uses_scaler':    best['uses_scaler'],
    'scaler':         scaler if best['uses_scaler'] else None,
    'trained_at':     _dt.now().isoformat(),
    'split_date':     split_date,
    'comparison':     comparison,
    'lag_medians':    train_lag_medians,
    'global_shap':    global_shap,
    'correlation':    correlation,
    # api cache — all from train partition
    'trend':          trend,
    'trend_meta':     trend_meta,
    'latest':         latest,
    'hourly':         hourly,
    'stations':       station_list,
}
with open('model.pkl', 'wb') as f:
    pickle.dump(artifact, f)

print(f"✓ Saved model.pkl  (model={best_name}, features={len(FEATURES)})")

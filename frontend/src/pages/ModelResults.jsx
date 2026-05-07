import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Award, AlertCircle, Info, Zap, GitBranch } from 'lucide-react';

const MODEL_DESCRIPTIONS = {
  LinearRegression: 'Baseline linear model. Assumes a straight-line relationship between features and AQI. Fast but limited — cannot capture non-linear pollutant interactions.',
  Ridge:            'Regularised linear regression (L2 penalty). Reduces overfitting compared to plain linear regression, but still constrained to linear relationships.',
  RandomForest:     'Ensemble of decision trees trained on random feature subsets. Robust against overfitting, handles non-linear interactions well, and naturally ranks feature importance.',
  GradientBoosting: 'Sequential ensemble where each tree corrects the errors of the previous. Strong predictive power with careful tuning; slightly slower than RandomForest.',
  XGBoost:          'Optimised gradient boosting with regularisation. State-of-the-art for tabular data — often the best performer on AQI prediction tasks with mixed pollutant and meteorological features.',
  LightGBM:         'Leaf-wise gradient boosting with histogram binning. Extremely fast on large datasets; comparable accuracy to XGBoost with lower memory usage.',
};

const METRIC_INFO = {
  r2:   { label: 'R²',   desc: 'Proportion of AQI variance explained by the model. Closer to 1.0 is better.',      good: v => v >= 0.9, fmt: v => v.toFixed(4) },
  rmse: { label: 'RMSE', desc: 'Root Mean Squared Error — average prediction error in AQI units. Lower is better.', good: v => v <= 20,  fmt: v => v.toFixed(2) },
  mae:  { label: 'MAE',  desc: 'Mean Absolute Error — average absolute deviation in AQI units. Lower is better.',   good: v => v <= 15,  fmt: v => v.toFixed(2) },
};

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6'];

// Colour-maps a Pearson r value: strong negative = blue, near-zero = neutral, strong positive = red
function corrColor(r) {
  const abs = Math.abs(r);
  if (r > 0) return `rgba(239,68,68,${0.15 + abs * 0.75})`;
  return `rgba(59,130,246,${0.15 + abs * 0.75})`;
}

function corrTextColor(r) {
  return Math.abs(r) > 0.5 ? '#fff' : 'hsl(var(--foreground))';
}

// Friendly display labels matching the abstract's terminology
const FEAT_LABELS = {
  'PM2.5': 'PM2.5', 'PM10': 'PM10', 'NO2': 'NO₂', 'CO': 'CO', 'SO2': 'SO₂',
  'Temperature': 'Temp', 'Humidity': 'Humidity', 'Wind Speed': 'Wind',
  'AQI': 'AQI',
};

export default function ModelResults() {
  const [info,        setInfo]        = useState(null);
  const [shapData,    setShapData]    = useState(null);
  const [corrData,    setCorrData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [metric,      setMetric]      = useState('r2');

  useEffect(() => {
    Promise.all([
      api.modelInfo(),
      api.shapSummary().catch(() => null),
      api.correlation().catch(() => null),
    ])
      .then(([infoRes, shapRes, corrRes]) => {
        setInfo(infoRes);
        setShapData(shapRes);
        setCorrData(corrRes);
      })
      .catch(() => setError('Cannot connect to backend. Ensure Flask is running on http://localhost:5000'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4 pt-8">
      {[1,2,3,4].map(i => <div key={i} className="bg-card rounded-2xl border h-36 animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="max-w-5xl mx-auto pt-8">
      <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl text-sm text-red-700 dark:text-red-300">
        <AlertCircle className="w-4 h-4 shrink-0" />{error}
      </div>
    </div>
  );

  const comparison = info?.comparison || {};
  const modelNames = Object.keys(comparison);
  const bestName   = info?.model_name;

  const chartData = modelNames.map((name, i) => ({
    name:   name.replace('Regression', 'Reg'),
    r2:     comparison[name].r2,
    rmse:   comparison[name].rmse,
    mae:    comparison[name].mae,
    color:  COLORS[i % COLORS.length],
    isBest: name === bestName,
  }));

  const m = METRIC_INFO[metric];

  // Global SHAP bar data — top 8 features by mean |SHAP|
  const shapChartData = shapData?.features
    ?.slice(0, 8)
    .map(f => ({ name: FEAT_LABELS[f.feature] || f.feature, value: f.mean_abs_shap })) || [];

  // Correlation heatmap data
  const corrFeatures = corrData?.features || [];
  const corrMatrix   = corrData?.matrix   || [];
  const aqiRow       = corrData?.aqi_row  || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-grotesk font-bold text-foreground">Model Performance Results</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Comparative evaluation of {modelNames.length} ML algorithms on Delhi AQI data from 3 monitoring stations
          {info?.split_date ? ` — chronological test split from ${info.split_date}` : ''}
        </p>
      </div>

      {/* ── Best model banner ── */}
      {bestName && (
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <Award className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Best model: <span className="text-primary">{bestName}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              R² = {info?.r2?.toFixed(4)} · RMSE = {info?.rmse?.toFixed(2)} AQI units · MAE = {comparison[bestName]?.mae?.toFixed(2)} AQI units
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">
              {MODEL_DESCRIPTIONS[bestName]}
            </p>
          </div>
        </div>
      )}

      {/* ── Summary metric cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(METRIC_INFO).map(([key, meta]) => {
          const val    = key === 'r2' ? info?.r2 : comparison[bestName]?.[key];
          const isGood = val != null && meta.good(val);
          return (
            <div key={key} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{meta.label} (best model)</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isGood ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                  {isGood ? 'good' : 'moderate'}
                </span>
              </div>
              <p className="text-2xl font-grotesk font-bold text-foreground">{val != null ? meta.fmt(val) : '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{meta.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── Metric toggle + model comparison bar chart ── */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            All Models — {m.label} Comparison
          </h2>
          <div className="flex gap-1.5">
            {Object.entries(METRIC_INFO).map(([key, meta]) => (
              <button key={key} onClick={() => setMetric(key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${metric === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                {meta.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{m.desc}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              domain={metric === 'r2' ? [0, 1] : ['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={v => [m.fmt(v), m.label]}
            />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.isBest ? '#3b82f6' : '#94a3b8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3b82f6] inline-block" /> Best model (selected)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#94a3b8] inline-block" /> Other models</span>
        </div>
      </div>

      {/* ── Full comparison table ── */}
      <div className="bg-card rounded-2xl border border-border p-5 overflow-x-auto">
        <h2 className="font-semibold text-foreground mb-4">Full Comparison Table</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Model', 'R²', 'RMSE', 'MAE', 'Notes'].map(h => (
                <th key={h} className={`py-2 px-3 text-xs text-muted-foreground font-medium ${h === 'Model' || h === 'Notes' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelNames.map(name => {
              const c      = comparison[name];
              const isBest = name === bestName;
              return (
                <tr key={name} className={`border-b border-border/50 ${isBest ? 'bg-primary/5' : ''}`}>
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      {isBest && <Award className="w-3 h-3 text-primary" />}
                      {name}
                    </span>
                  </td>
                  <td className={`text-right py-2.5 px-3 text-xs font-semibold ${c.r2 >= 0.9 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>{c.r2.toFixed(4)}</td>
                  <td className={`text-right py-2.5 px-3 text-xs ${c.rmse <= 20 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>{c.rmse.toFixed(2)}</td>
                  <td className={`text-right py-2.5 px-3 text-xs ${c.mae <= 15 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>{c.mae.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[280px]">
                    {MODEL_DESCRIPTIONS[name]?.split('.')[0] + '.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── SHAP Global Feature Importance ── */}
      {shapChartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">SHAP — Global Feature Importance</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Mean absolute SHAP value per feature across a representative sample of the training data.
            Measures the <span className="font-medium text-foreground">average impact of each pollutant and environmental factor</span> on
            AQI predictions — directly implementing the SHAP analysis described in the study.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={shapChartData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Mean |SHAP|', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={v => [v.toFixed(4), 'Mean |SHAP|']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {shapChartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#3b82f6' : i === 1 ? '#6366f1' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-3">
            Computed using TreeExplainer (Shapley Additive Explanations) on {bestName}. Higher values indicate greater influence on predicted AQI.
          </p>
        </div>
      )}

      {/* ── Pollutant–AQI Correlation Bar Chart ── */}
      {Object.keys(aqiRow).length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Pearson Correlation — Pollutants &amp; Meteorological Factors vs AQI</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Pearson r coefficient between each input variable and AQI across all stations and time steps.
            Positive values (red) show pollutants that increase AQI; negative values (blue) show factors that reduce it.
            This quantifies the <span className="font-medium text-foreground">correlation of pollutants and environmental factors</span> described in the study.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={Object.entries(aqiRow).map(([k, v]) => ({ name: FEAT_LABELS[k] || k, value: v }))}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'r', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={v => [v.toFixed(3), 'Pearson r vs AQI']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {Object.entries(aqiRow).map(([, v], i) => (
                  <Cell key={i} fill={v >= 0 ? '#ef4444' : '#3b82f6'} fillOpacity={0.6 + Math.abs(v) * 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-red-500/80 inline-block" /> Positive correlation (raises AQI)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-500/80 inline-block" /> Negative correlation (lowers AQI)</span>
          </div>
        </div>
      )}

      {/* ── Full Pearson Correlation Heatmap ── */}
      {corrFeatures.length > 0 && corrMatrix.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 overflow-x-auto">
          <h2 className="font-semibold text-foreground mb-1">Full Correlation Matrix</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Pairwise Pearson correlations across all pollutants, meteorological factors, and AQI.
            Red = strong positive, blue = strong negative, near-white = weak correlation.
          </p>
          <table className="text-center border-collapse text-xs" style={{ minWidth: corrFeatures.length * 52 }}>
            <thead>
              <tr>
                <th className="w-16" />
                {corrFeatures.map(f => (
                  <th key={f} className="w-12 py-1 px-0.5 text-[10px] font-medium text-muted-foreground"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 64 }}>
                    {FEAT_LABELS[f] || f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corrMatrix.map((row, ri) => (
                <tr key={ri}>
                  <td className="py-0.5 pr-2 text-[10px] text-muted-foreground text-right font-medium whitespace-nowrap">
                    {FEAT_LABELS[corrFeatures[ri]] || corrFeatures[ri]}
                  </td>
                  {row.map((val, ci) => (
                    <td key={ci}
                      style={{ background: corrColor(val), color: corrTextColor(val) }}
                      className="w-12 h-10 text-[10px] font-medium border border-background/30 rounded"
                      title={`${corrFeatures[ri]} vs ${corrFeatures[ci]}: ${val}`}>
                      {val.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Results Interpretation ── */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Results Interpretation</h2>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Using 1-hour observations of major pollutants (PM2.5, PM10, NO₂, CO, SO₂) and meteorological conditions
            (temperature, humidity, wind speed) from 3 Delhi monitoring stations, multiple ML algorithms were trained and evaluated.
            The results confirm that <span className="font-medium text-foreground">tree-based ensemble methods significantly outperform
            linear models</span> for AQI prediction — the relationship between pollutants and AQI involves non-linear interactions
            and seasonal thresholds that linear regression cannot capture.
          </p>
          <p>
            Time-based features (hour-of-day, month, season, is_winter, is_peak_hour) and 3-hour lag features (PM2.5_lag3, PM10_lag3)
            represent seasonal and hourly trends and account for localised air quality conditions, as described in the study.
            The SHAP global importance chart above confirms these engineered features consistently rank among the top contributors.
          </p>
          <p>
            <span className="font-medium text-foreground">SHAP (Shapley Additive Explanations)</span> was applied to the selected {bestName} model
            to measure the impact of each pollutant and environmental factor. The mean |SHAP| ranking and Pearson correlation matrix
            together reveal the meaningful correlations between pollutants and AQI — supporting appropriate
            air quality management plans for environmental and public health planning.
          </p>
        </div>
      </div>

      {/* ── Training metadata ── */}
      {info?.trained_at && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-2">
          <span>Trained: {new Date(info.trained_at).toLocaleString('en-IN')}</span>
          {info.split_date && <span>Chronological test split from: {info.split_date}</span>}
          <span>Features: {info.features?.length ?? 15}</span>
          <span>Stations: 3</span>
        </div>
      )}
    </div>
  );
}

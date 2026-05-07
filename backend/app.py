import pickle
from datetime import datetime
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import shap as _shap

app = Flask(__name__)
CORS(app)

# ── Load artifact (single source of truth — no data.json dependency) ──────────
with open('model.pkl', 'rb') as f:
    art = pickle.load(f)

MODEL       = art['model']
FEATURES    = art['features']
USES_SCALER = art.get('uses_scaler', False)
SCALER      = art.get('scaler', None)
TREND       = art['trend']
TREND_META  = art.get('trend_meta', {})
LATEST      = art['latest']
HOURLY      = art['hourly']
STATIONS    = art['stations']
LAG_MEDIANS = art.get('lag_medians', {})
GLOBAL_SHAP = art.get('global_shap', {})
CORRELATION = art.get('correlation', {})

_explainer = _shap.TreeExplainer(MODEL)

# ── Helpers ───────────────────────────────────────────────────────────────────
def category(aqi):
    if aqi<=50:  return 'Good'
    if aqi<=100: return 'Satisfactory'
    if aqi<=200: return 'Moderate'
    if aqi<=300: return 'Poor'
    if aqi<=400: return 'Very Poor'
    return 'Severe'

def health_tip(cat):
    return {
        'Good':         'Air quality is good. Safe for all.',
        'Satisfactory': 'Acceptable. Sensitive groups take care.',
        'Moderate':     'Sensitive groups may be affected.',
        'Poor':         'Everyone may feel health effects.',
        'Very Poor':    'Health alert. Avoid outdoor activity.',
        'Severe':       'Emergency. Stay indoors.',
    }.get(cat, '')

def management_plan(cat):
    """Return a structured air quality management plan for the given AQI category."""
    plans = {
        'Good': {
            'public_advisory': 'Air quality is satisfactory. No restrictions needed for any population group.',
            'activity_restrictions': [
                'All outdoor activities permitted.',
                'Schools and workplaces may operate normally.',
            ],
            'interventions': [
                'Continue routine emissions monitoring at all stations.',
                'Maintain green cover and urban vegetation programs.',
            ],
            'monitoring_actions': [
                'Standard hourly AQI logging across all 3 stations.',
                'Review seasonal baseline data for long-term trend analysis.',
            ],
            'target_groups': [],
            'alert_level': 'none',
        },
        'Satisfactory': {
            'public_advisory': 'Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.',
            'activity_restrictions': [
                'General population: no restrictions.',
                'Sensitive individuals (asthma, heart conditions): reduce prolonged outdoor exertion.',
            ],
            'interventions': [
                'Issue advisory to hospitals and health centers.',
                'Monitor vehicle emission hotspots near high-traffic corridors.',
            ],
            'monitoring_actions': [
                'Increase sampling frequency for PM2.5 and PM10.',
                'Flag any upward AQI trend over the next 6 hours.',
            ],
            'target_groups': ['Asthma patients', 'Elderly', 'Children under 12'],
            'alert_level': 'low',
        },
        'Moderate': {
            'public_advisory': 'Sensitive groups may experience health effects. General public unlikely to be affected. Reduce time spent outdoors.',
            'activity_restrictions': [
                'Children and elderly should limit outdoor activity to under 30 minutes.',
                'Avoid heavy outdoor exercise during peak hours (7–10 AM, 6–10 PM).',
                'Schools should shift outdoor PE sessions indoors.',
            ],
            'interventions': [
                'Activate dust suppression measures on major construction sites.',
                'Increase frequency of water-sprinkling on roads in affected zones.',
                'Issue public health advisory through local media.',
            ],
            'monitoring_actions': [
                'Deploy mobile monitoring units to high-density residential areas.',
                'Cross-check PM2.5 spike against wind direction data for source identification.',
                'Alert Delhi Pollution Control Committee (DPCC) for situational awareness.',
            ],
            'target_groups': ['Asthma patients', 'COPD patients', 'Elderly', 'Children under 12', 'Pregnant women'],
            'alert_level': 'moderate',
        },
        'Poor': {
            'public_advisory': 'Everyone may begin to experience adverse health effects. Sensitive groups will experience more serious effects. Limit outdoor exposure.',
            'activity_restrictions': [
                'Avoid all strenuous outdoor activity.',
                'Schools should cancel outdoor events and sports.',
                'Construction activity generating dust should be halted between 6 AM – 8 PM.',
                'Consider work-from-home advisories for non-essential workers.',
            ],
            'interventions': [
                'Enforce odd-even vehicle rationing in severely affected zones.',
                'Ban open waste burning and crop residue burning.',
                'Activate industrial emission reduction protocols — shut non-essential units.',
                'Deploy additional water-tanker sprinkling on arterial roads.',
                'Issue public health advisory via SMS broadcast to registered citizens.',
            ],
            'monitoring_actions': [
                'Trigger GRAP (Graded Response Action Plan) Stage II measures.',
                'Report to CPCB and state authority with hourly data feeds.',
                'Identify dominant pollutant source using SHAP contribution analysis.',
                'Forecast next 24-hour AQI trend and pre-position health response teams.',
            ],
            'target_groups': ['General public', 'Asthma/COPD patients', 'Elderly', 'Children', 'Pregnant women', 'Outdoor workers'],
            'alert_level': 'high',
        },
        'Very Poor': {
            'public_advisory': 'Health alert — everyone may experience serious health effects. Avoid all outdoor activities. Stay indoors with windows closed.',
            'activity_restrictions': [
                'All outdoor recreational activities must be suspended.',
                'Schools, colleges, and coaching centres must shift to online mode.',
                'Ban all construction and demolition activity.',
                'Halt thermal power plants operating beyond permitted emission limits.',
                'Public gatherings of over 50 people prohibited outdoors.',
            ],
            'interventions': [
                'Enforce GRAP Stage III — ban diesel generators (except hospitals), brick kilns, hot mix plants.',
                'Mandatory use of dust suppressants at all infrastructure project sites.',
                'Deploy emergency anti-smog guns at major intersections.',
                'Increase frequency of metro/bus services to reduce private vehicle usage.',
                'Issue health emergency advisory through all government channels.',
            ],
            'monitoring_actions': [
                'Activate 24/7 emergency monitoring at all 3 stations.',
                'Establish a real-time pollution war room with DPCC and municipal bodies.',
                'Dispatch field teams to identify and seal illegal burning sites.',
                'Coordinate with IMD for meteorological forecast — assess ventilation index.',
            ],
            'target_groups': ['Entire population', 'Critical care for elderly and children', 'Hospitalization preparedness for respiratory cases'],
            'alert_level': 'very_high',
        },
        'Severe': {
            'public_advisory': 'Emergency condition. AQI is hazardous. All residents must stay indoors. Seal windows and doors. Use N95 masks if going outside is unavoidable.',
            'activity_restrictions': [
                'Complete suspension of all outdoor activities.',
                'Mandatory school and university closure.',
                'Non-essential government offices to operate at 50% capacity from home.',
                'Ban on all vehicles except emergency and essential services in worst-affected zones.',
                'All industrial units except essential services to shut down immediately.',
            ],
            'interventions': [
                'Enforce GRAP Stage IV — emergency shutdown of all identified pollutant sources.',
                'Helicopter-based water sprinkling over severely affected zones (if permissible).',
                'Emergency coordination with hospitals — activate respiratory emergency wards.',
                'Coordinate with neighboring state governments for stubble-burning enforcement.',
                'Request central government for immediate inter-agency air quality task force.',
            ],
            'monitoring_actions': [
                'Continuous real-time data feed to CPCB national dashboard.',
                'Issue hourly public bulletins with AQI updates and health advisories.',
                'Deploy satellite imagery analysis to identify regional pollution sources.',
                'Post-event analysis of pollutant mix using SHAP breakdown for policy reporting.',
                'Document episode for long-term management plan and regulatory review.',
            ],
            'target_groups': ['Entire population — emergency health response', 'Pre-position ambulances near high-density areas', 'ICU preparedness for respiratory and cardiac cases'],
            'alert_level': 'emergency',
        },
    }
    return plans.get(cat, plans['Moderate'])

def contrib(vals):
    x  = np.array(vals, dtype=float).reshape(1, -1)
    sv = _explainer.shap_values(x)[0]
    return {f: round(float(sv[i]), 2) for i, f in enumerate(FEATURES)}

def time_features(dt=None):
    dt = dt or datetime.now()
    h  = dt.hour
    mo = dt.month
    season_map = {12:0,1:0,2:0,3:1,4:1,5:1,6:2,7:2,8:2,9:3,10:3,11:3}
    season     = season_map[mo]
    is_winter  = int(season == 0)
    is_peak    = int((7 <= h <= 10) or (18 <= h <= 22))
    return h, mo, season, is_winter, is_peak

def _safe(v, dec=1):
    try:    return round(float(v), dec)
    except: return 0.0

def _build_vals(d):
    so2       = float(d.get('so2', 0))
    hour      = int(d.get('hour', datetime.now().hour))
    month     = int(d.get('month', datetime.now().month))
    season_map= {12:0,1:0,2:0,3:1,4:1,5:1,6:2,7:2,8:2,9:3,10:3,11:3}
    season    = int(d.get('season', season_map[month]))
    is_winter = int(bool(d.get('is_winter', season == 0)))
    is_peak   = int(bool(d.get('is_peak_hour', (7<=hour<=10)or(18<=hour<=22))))
    pm25      = float(d['pm25'])
    pm10      = float(d['pm10'])

    lookup = {
        'PM2.5':        pm25,
        'PM10':         pm10,
        'NO2':          float(d['no2']),
        'CO':           float(d['co']),
        'SO2':          so2,
        'Temperature':  float(d['temp']),
        'Humidity':     float(d['humidity']),
        'Wind Speed':   float(d['wind']),
        'hour':         hour,
        'month':        month,
        'season':       season,
        'is_winter':    is_winter,
        'is_peak_hour': is_peak,
        'PM2.5_lag3':   float(d.get('pm25_lag3', LAG_MEDIANS.get('PM2.5_lag3', pm25))),
        'PM10_lag3':    float(d.get('pm10_lag3', LAG_MEDIANS.get('PM10_lag3', pm10))),
    }
    return [lookup[f] for f in FEATURES]

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health')
def health():
    trained_at = art.get('trained_at', '')
    try:
        age_hours = round(
            (datetime.now() - datetime.fromisoformat(trained_at)).total_seconds() / 3600, 2
        )
    except Exception:
        age_hours = -1.0
    return jsonify({
        'status':          'ok',
        'model':           art.get('model_name', 'RandomForest'),
        'stations':        len(STATIONS),
        'trained_at':      trained_at[:19] if trained_at else '',
        'split_date':      art.get('split_date', ''),
        'model_age_hours': age_hours,
        'r2':              round(art.get('r2', 0), 4),
        'rmse':            round(art.get('rmse', 0), 4),
    })

@app.route('/model-info')
def model_info():
    return jsonify({
        'model_name': art.get('model_name', 'RandomForest'),
        'r2':         art.get('r2', None),
        'rmse':       art.get('rmse', None),
        'features':   FEATURES,
        'comparison': art.get('comparison', {}),
        'trained_at': art.get('trained_at', ''),
        'split_date': art.get('split_date', ''),
    })

@app.route('/stations')
def stations():
    hour_param = request.args.get('hour')
    now = datetime.now()
    if hour_param is not None:
        now = now.replace(hour=int(hour_param))
    h, mo, season, is_winter, is_peak = time_features(now)

    out = []
    for r in LATEST:
        aqi = int(round(_safe(r.get('AQI', 0), 0)))
        cat = category(aqi)
        out.append({
            'station':      r['station'],
            'aqi':          aqi,
            'category':     cat,
            'alert':        aqi > 300,
            'hour':         h,
            'month':        mo,
            'season':       season,
            'is_winter':    bool(is_winter),
            'is_peak_hour': bool(is_peak),
            'pollutants': {
                'pm25':     _safe(r.get('PM2.5')),
                'pm10':     _safe(r.get('PM10')),
                'no2':      _safe(r.get('NO2')),
                'so2':      _safe(r.get('SO2', 0)),
                'co':       _safe(r.get('CO'), 2),
                'temp':     _safe(r.get('Temperature')),
                'humidity': _safe(r.get('Humidity')),
                'wind':     _safe(r.get('Wind Speed')),
            }
        })
    out.sort(key=lambda x: x['aqi'], reverse=True)
    return jsonify({'stations': out, 'count': len(out)})

@app.route('/predict', methods=['POST'])
def predict():
    d = request.get_json(force=True) or {}
    missing = [k for k in ['pm25','pm10','no2','co','temp','humidity','wind'] if k not in d]
    if missing:
        return jsonify({'error': f'Missing: {missing}'}), 400
    try:
        vals = _build_vals(d)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    x   = np.array([vals])
    if USES_SCALER and SCALER is not None:
        x = SCALER.transform(x)
    aqi = int(round(float(np.clip(MODEL.predict(x)[0], 0, 500))))
    cat = category(aqi)
    c   = contrib(vals)

    return jsonify({
        'aqi':             aqi,
        'category':        cat,
        'alert':           aqi > 300,
        'health_tip':      health_tip(cat),
        'management_plan': management_plan(cat),
        'contributions':   c,
        'model_used':      art.get('model_name', 'RandomForest'),
        'model_name':      art.get('model_name', 'RandomForest'),
        'r2':              art.get('r2', None),
    })

@app.route('/trend')
def trend():
    s = request.args.get('station')
    if s:
        data = TREND.get(s)
        if not data:
            return jsonify({'error': 'Not found',
                            'available': list(TREND.keys())[:5]}), 404
        meta = TREND_META.get(s, {})
        return jsonify({
            'station':   s,
            'date_from': meta.get('date_from', data[0]['label']  if data else ''),
            'date_to':   meta.get('date_to',   data[-1]['label'] if data else ''),
            'data':      data,
        })
    keys   = list(TREND.keys())
    base   = TREND[keys[0]]
    merged = [{'label': pt['label'],
               **{k: (TREND[k][i]['AQI'] if i < len(TREND[k]) else None) for k in keys}}
              for i, pt in enumerate(base)]
    all_from = [TREND_META[k]['date_from'] for k in keys if k in TREND_META]
    all_to   = [TREND_META[k]['date_to']   for k in keys if k in TREND_META]
    return jsonify({
        'stations':  keys,
        'date_from': min(all_from) if all_from else '',
        'date_to':   max(all_to)   if all_to   else '',
        'data':      merged,
    })

@app.route('/hourly')
def hourly():
    return jsonify({'data': HOURLY})

@app.route('/shap-summary')
def shap_summary():
    """Global mean |SHAP| per feature — shows which pollutants and
    environmental factors drive AQI predictions across the dataset
    (abstract: 'impact of each pollutant and environmental factor was
    measured using SHAP')."""
    ranked = sorted(GLOBAL_SHAP.items(), key=lambda x: x[1], reverse=True)
    return jsonify({
        'model_name': art.get('model_name', 'RandomForest'),
        'trained_on': art.get('trained_at', ''),
        'features':   [{'feature': k, 'mean_abs_shap': v} for k, v in ranked],
    })

@app.route('/correlation')
def correlation():
    """Pearson correlation matrix of pollutants + meteorological factors
    vs AQI — supports the abstract's claim about 'correlation of pollutants
    and environmental factors'."""
    if not CORRELATION:
        return jsonify({'error': 'Correlation data not in model artifact. Re-run train.py.'}), 404
    return jsonify(CORRELATION)

if __name__ == '__main__':
    print('Delhi AQI backend → http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=False)

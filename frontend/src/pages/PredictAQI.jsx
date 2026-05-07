import { db } from "@/api/base44Client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AQIGauge from "@/components/aqi/AQIGauge";
import AQIBadge from "@/components/aqi/AQIBadge";
import SHAPChart from "@/components/aqi/SHAPChart";
import { POLLUTANTS, getAQIDescription } from "@/utils/aqi";
import { api } from "@/utils/api";
import { llmPredictAQI } from "@/utils/llmPredict";
import { Sparkles, RotateCcw, Loader2, Brain, ShieldCheck, ClipboardList, AlertTriangle, Activity, Eye } from "lucide-react";

const ALERT_COLORS = {
  none:      { bg: 'bg-green-50 dark:bg-green-950',  border: 'border-green-200 dark:border-green-800',  text: 'text-green-800 dark:text-green-200'  },
  low:       { bg: 'bg-blue-50 dark:bg-blue-950',    border: 'border-blue-200 dark:border-blue-800',    text: 'text-blue-800 dark:text-blue-200'    },
  moderate:  { bg: 'bg-yellow-50 dark:bg-yellow-950',border: 'border-yellow-200 dark:border-yellow-800',text: 'text-yellow-800 dark:text-yellow-200' },
  high:      { bg: 'bg-orange-50 dark:bg-orange-950',border: 'border-orange-200 dark:border-orange-800',text: 'text-orange-800 dark:text-orange-200' },
  very_high: { bg: 'bg-red-50 dark:bg-red-950',      border: 'border-red-200 dark:border-red-800',      text: 'text-red-800 dark:text-red-200'      },
  emergency: { bg: 'bg-purple-50 dark:bg-purple-950',border: 'border-purple-200 dark:border-purple-800',text: 'text-purple-800 dark:text-purple-200' },
};

const SECTION_META = [
  { key: 'activity_restrictions', label: 'Activity Restrictions', Icon: Activity },
  { key: 'interventions',         label: 'Interventions',         Icon: AlertTriangle },
  { key: 'monitoring_actions',    label: 'Monitoring Actions',    Icon: Eye },
];

function ManagementPlan({ plan }) {
  if (!plan) return null;
  const colors = ALERT_COLORS[plan.alert_level] || ALERT_COLORS.moderate;
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <span className="w-1.5 h-4 bg-primary rounded-full inline-block" />
        Air Quality Management Plan
      </h3>
      <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <div className="flex items-start gap-2">
          <ClipboardList className={`w-4 h-4 shrink-0 mt-0.5 ${colors.text}`} />
          <p className={`text-sm font-medium ${colors.text}`}>{plan.public_advisory}</p>
        </div>
      </div>
      {SECTION_META.map(({ key, label, Icon }) =>
        plan[key]?.length ? (
          <div key={key}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
            <ul className="space-y-1.5">
              {plan[key].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
      {plan.target_groups?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">At-Risk Groups</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.target_groups.map((g, i) => (
              <span key={i} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${colors.bg} ${colors.border} ${colors.text}`}>
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_INPUTS = { pm25: 0, pm10: 0, no2: 0, co: 0, so2: 0, temp: 0, humidity: 0, wind: 0 };

function getSeason(month) {
  if ([12,1,2].includes(month)) return 0;
  if ([3,4,5].includes(month))  return 1;
  if ([6,7,8].includes(month))  return 2;
  return 3;
}

function pollutantsFromStation(s) {
  const p = s?.pollutants || {};
  return {
    pm25:     p.pm25     ?? 0,
    pm10:     p.pm10     ?? 0,
    no2:      p.no2      ?? 0,
    co:       p.co       ?? 0,
    so2:      p.so2      ?? 0,
    temp:     p.temp     ?? 0,
    humidity: p.humidity ?? 0,
    wind:     p.wind     ?? 0,
  };
}

export default function PredictAQI() {
  const [stationList,  setStationList]  = useState([]);
  const [station,      setStation]      = useState('');
  const [inputs,       setInputs]       = useState(EMPTY_INPUTS);
  const [hour,         setHour]         = useState(new Date().getHours());
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState(null);
  const [fetchError,   setFetchError]   = useState(null);

  const stationMap = useRef({});

  const month        = new Date().getMonth() + 1;
  const season       = getSeason(month);
  const is_winter    = season === 0;
  const is_peak_hour = (hour >= 7 && hour <= 10) || (hour >= 18 && hour <= 22);

  // FIX #9: fetch all stations on mount; pre-fill inputs from real API data
  useEffect(() => {
    api.stations()
      .then(d => {
        if (!d.stations?.length) return;
        d.stations.forEach(s => { stationMap.current[s.station] = s; });
        setStationList(d.stations);
        const first = d.stations[0];
        setStation(first.station);
        setInputs(pollutantsFromStation(first));
      })
      .catch(() => setFetchError('Could not load stations. Is the backend running?'));
  }, []);

  function handleStation(name) {
    setStation(name);
    const s = stationMap.current[name];
    if (s) setInputs(pollutantsFromStation(s));
    setResult(null); setSaved(false); setError(null);
  }

  function handleChange(key, val) {
    setInputs(p => ({ ...p, [key]: parseFloat(val) || 0 }));
    setResult(null); setSaved(false);
  }

  function reset() {
    const s = stationMap.current[station];
    setInputs(s ? pollutantsFromStation(s) : EMPTY_INPUTS);
    setResult(null); setSaved(false); setError(null);
  }

  async function predict() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await llmPredictAQI({
        pm25:        inputs.pm25,
        pm10:        inputs.pm10,
        no2:         inputs.no2,
        co:          inputs.co,
        so2:         inputs.so2,
        temperature: inputs.temp,
        humidity:    inputs.humidity,
        wind_speed:  inputs.wind,
        hour, month, season, is_winter, is_peak_hour,
      });
      setResult(res); setSaved(false);
    } catch (err) {
      setError(err.message || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function savePrediction() {
    if (!result) return;
    setSaving(true);
    const shap = result.shap || {};
    await db.entities.Prediction.create({
      station,
      timestamp:        new Date().toISOString(),
      predicted_aqi:    result.aqi,
      category:         result.category,
      ...inputs,
      shap_pm25:        shap['PM2.5']       ?? 0,
      shap_pm10:        shap['PM10']        ?? 0,
      shap_no2:         shap['NO2']         ?? 0,
      shap_co:          shap['CO']          ?? 0,
      shap_so2:         shap['SO2']         ?? 0,
      shap_temperature: shap['Temperature'] ?? 0,
      shap_humidity:    shap['Humidity']    ?? 0,
      shap_wind_speed:  shap['Wind Speed']  ?? 0,
      shap_hour:        shap['hour']        ?? 0,
      model_accuracy:   result.confidence,
    });
    setSaved(true); setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-grotesk font-bold text-foreground">Predict AQI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a station to auto-fill latest readings, then run prediction with SHAP explanations.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <Brain className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">
          Predictions are generated by the trained ML model (via <span className="font-semibold">/predict</span> endpoint) using 1-hour pollutant and meteorological inputs from the selected station. SHAP values reflect the model's feature contributions for each prediction.
        </p>
      </div>

      {fetchError && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{fetchError}</p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Input Parameters</h2>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset to Station Values
            </Button>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Monitoring Station</Label>
            <Select value={station} onValueChange={handleStation} disabled={stationList.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={stationList.length === 0 ? 'Loading stations…' : 'Select station'} />
              </SelectTrigger>
              <SelectContent>
                {stationList.map(s => (
                  <SelectItem key={s.station} value={s.station}>{s.station}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hour of Day (0–23)</Label>
            <Input type="number" min={0} max={23} value={hour}
              onChange={e => setHour(parseInt(e.target.value) || 0)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {POLLUTANTS.map(({ key, label, unit }) => (
              <div key={key}>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {label} <span className="text-[10px] opacity-60">({unit})</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputs[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <Button onClick={predict} disabled={loading || stationList.length === 0}
            className="w-full bg-primary text-primary-foreground">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Predicting…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Run Prediction</>}
          </Button>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="font-semibold text-foreground">Model Running…</p>
              <p className="text-sm text-muted-foreground mt-1">Calculating AQI + SHAP contributions</p>
            </div>
          ) : result ? (
            <>
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
                <AQIGauge aqi={result.aqi} size="lg" />
                <div className="mt-4 space-y-1.5">
                  <AQIBadge category={result.category} size="md" />
                  <p className="text-xs text-muted-foreground max-w-xs">{getAQIDescription(result.category)}</p>
                </div>

                {result.reasoning && (
                  <div className="mt-3 p-3 bg-secondary rounded-xl w-full text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Top Driver</p>
                    <p className="text-xs text-foreground italic">"{result.reasoning}"</p>
                  </div>
                )}

                {result.health_recommendation && (
                  <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl w-full text-left flex gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary">{result.health_recommendation}</p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 w-full text-xs">
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-muted-foreground">Station</p>
                    <p className="font-semibold text-foreground mt-0.5 truncate">{station}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-semibold text-foreground mt-0.5">{result.model_name}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-muted-foreground">Confidence (R²-based)</p>
                    <p className="font-semibold text-foreground mt-0.5">{result.confidence}%</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-muted-foreground">SHAP explainer</p>
                    <p className="font-semibold text-foreground mt-0.5">TreeExplainer</p>
                  </div>
                </div>

                <Button className="w-full mt-4" variant={saved ? 'outline' : 'default'}
                  onClick={savePrediction} disabled={saving || saved}>
                  {saved ? '✓ Saved to Database' : saving ? 'Saving...' : 'Save Prediction'}
                </Button>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-accent rounded-full inline-block" />
                  SHAP Feature Contributions
                </h3>
                <SHAPChart shap={result.shap} baseAqi={100} modelName={result.model_name} />
              </div>

              <ManagementPlan plan={result.management_plan} />
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Ready</p>
              <p className="text-sm text-muted-foreground mt-1">Select a station and click Run Prediction</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

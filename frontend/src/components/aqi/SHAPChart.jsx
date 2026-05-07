import { getAQIColor } from "@/utils/aqi";

const LABELS = {
  'PM2.5':       'PM2.5',
  'PM10':        'PM10',
  'NO2':         'NO₂',
  'CO':          'CO',
  'SO2':         'SO₂',
  'Temperature': 'Temperature',
  'Humidity':    'Humidity',
  'Wind Speed':  'Wind Speed',
  'hour':        'Hour of Day',
  'month':       'Month',
  'season':      'Season',
  'is_winter':   'Is Winter',
  'is_peak_hour':'Peak Hour',
  // legacy frontend keys
  pm25:        'PM2.5',
  pm10:        'PM10',
  no2:         'NO₂',
  co:          'CO',
  so2:         'SO₂',
  temperature: 'Temperature',
  humidity:    'Humidity',
  wind_speed:  'Wind Speed',
};

export default function SHAPChart({ shap, baseAqi = 120, modelName }) {
  if (!shap) return null;

  const entries = Object.entries(shap)
    .map(([key, val]) => ({ key, label: LABELS[key] || key, value: parseFloat((val ?? 0).toFixed(1)) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);

  const maxAbs = Math.max(...entries.map(e => Math.abs(e.value)), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>← Decreases AQI</span>
        <span className="font-medium text-foreground">SHAP Contributions</span>
        <span>Increases AQI →</span>
      </div>

      {entries.map(({ key, label, value }) => {
        const isPositive = value >= 0;
        const pct   = (Math.abs(value) / maxAbs) * 50;
        const color = isPositive ? "#ef4444" : "#22c55e";
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{label}</span>
            <div className="flex-1 flex items-center h-7 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <div
                className="absolute h-5 rounded transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  left: isPositive ? "50%" : `calc(50% - ${pct}%)`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-xs font-semibold w-14 shrink-0" style={{ color }}>
              {isPositive ? "+" : ""}{value}
            </span>
          </div>
        );
      })}

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Base AQI: <span className="font-semibold text-foreground">{baseAqi}</span></span>
        <span className="text-[10px]">via {modelName || 'RandomForest'} TreeExplainer</span>
      </div>
    </div>
  );
}

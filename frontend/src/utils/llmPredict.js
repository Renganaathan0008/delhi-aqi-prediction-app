import { api } from './api';

export async function llmPredictAQI({ pm25, pm10, no2, co, so2, temperature, humidity, wind_speed, hour, month, season, is_winter, is_peak_hour }) {
  const r = await api.predict({
    pm25, pm10, no2, co,
    so2:          so2 ?? 0,
    temp:         temperature,
    humidity,
    wind:         wind_speed ?? 3,
    hour:         hour ?? new Date().getHours(),
    month:        month ?? (new Date().getMonth() + 1),
    season:       season ?? 0,
    is_winter:    is_winter ?? false,
    is_peak_hour: is_peak_hour ?? false,
  });

  // Confidence from R² (multiply by 100, clamp 0–100)
  const confidence = r.r2 != null
    ? Math.min(100, Math.max(0, Math.round(r.r2 * 100)))
    : 85;

  // Reasoning from top SHAP contributor
  const contribs = r.contributions || {};
  const topKey   = Object.keys(contribs).reduce((a, b) =>
    Math.abs(contribs[a] ?? 0) >= Math.abs(contribs[b] ?? 0) ? a : b, Object.keys(contribs)[0] || 'PM2.5');
  const topVal   = contribs[topKey] ?? 0;
  const direction = topVal >= 0 ? 'increasing' : 'decreasing';
  const reasoning = `${topKey} (SHAP: ${topVal > 0 ? '+' : ''}${topVal}) is the dominant driver, ${direction} AQI.${r.alert ? ' ⚠️ AQI > 300 — severe alert.' : ''}`;

  // Map contributions directly from backend keys
  const shap = { ...contribs };

  return {
    aqi:                   r.aqi,
    category:              r.category,
    confidence,
    reasoning,
    health_recommendation: r.health_tip,
    management_plan:       r.management_plan || null,
    model_name:            r.model_name || 'RandomForest',
    shap,
  };
}

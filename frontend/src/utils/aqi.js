export const getAQICategory = aqi =>
  aqi<=50?'Good':aqi<=100?'Satisfactory':aqi<=200?'Moderate':aqi<=300?'Poor':aqi<=400?'Very Poor':'Severe';

export const getAQIColor = cat => ({'Good':'#22c55e','Satisfactory':'#84cc16','Moderate':'#eab308',
  'Poor':'#f97316','Very Poor':'#ef4444','Severe':'#7c3aed'})[cat]||'#22c55e';

export const getAQIBg = cat => ({'Good':'bg-green-500/10 border-green-500 text-green-500',
  'Satisfactory':'bg-lime-500/10 border-lime-500 text-lime-500',
  'Moderate':'bg-yellow-500/10 border-yellow-500 text-yellow-500',
  'Poor':'bg-orange-500/10 border-orange-500 text-orange-500',
  'Very Poor':'bg-red-500/10 border-red-500 text-red-500',
  'Severe':'bg-purple-600/10 border-purple-600 text-purple-600'})[cat]||'';

export const getAQIDescription = cat => ({'Good':'Minimal health risk.','Satisfactory':'Sensitive groups may be mildly affected.',
  'Moderate':'Unhealthy for sensitive groups.','Poor':'Everyone may experience health effects.',
  'Very Poor':'Health alert — serious effects.','Severe':'Health emergency.'})[cat]||'';

// FIX 8: fetch dynamically from backend — export empty array as fallback
export const STATIONS = [];

export const POLLUTANTS = [
  {key:'pm25',     label:'PM2.5',       unit:'µg/m³', normal:60},
  {key:'pm10',     label:'PM10',        unit:'µg/m³', normal:100},
  {key:'no2',      label:'NO₂',         unit:'µg/m³', normal:80},
  {key:'co',       label:'CO',          unit:'mg/m³', normal:10},
  {key:'so2',      label:'SO₂',         unit:'µg/m³', normal:80},
  {key:'temp',     label:'Temperature', unit:'°C',     normal:25},
  {key:'humidity', label:'Humidity',    unit:'%',      normal:60},
  {key:'wind',     label:'Wind Speed',  unit:'m/s',    normal:5},
];

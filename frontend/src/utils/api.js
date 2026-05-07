const BASE = 'http://localhost:5000';
const get  = p => fetch(`${BASE}${p}`).then(r => { if(!r.ok) throw new Error(`${p} ${r.status}`); return r.json(); });
const post = (p,b) => fetch(`${BASE}${p}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
  .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error||r.status); return d; });

export const api = {
  stations:    ()  => get('/stations'),
  trend:       (s) => get(s ? `/trend?station=${encodeURIComponent(s)}` : '/trend'),
  hourly:      ()  => get('/hourly'),
  modelInfo:   ()  => get('/model-info'),
  predict:     (b) => post('/predict', b),
  shapSummary: ()  => get('/shap-summary'),
  correlation: ()  => get('/correlation'),
};

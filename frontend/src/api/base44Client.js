// Local storage-backed DB — no external services
function makeStore(name) {
  const key = `aqi_${name}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
  const save = (r) => localStorage.setItem(key, JSON.stringify(r));
  const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  return {
    async filter(q = {}) { return load().filter(r => Object.entries(q).every(([k,v]) => r[k] === v)); },
    async get(id)         { return load().find(r => r.id === id) || null; },
    async create(d)       { const r = { id: uid(), created_at: new Date().toISOString(), ...d }; save([...load(), r]); return r; },
    async bulkCreate(arr) { const rs = arr.map(d => ({ id: uid(), created_at: new Date().toISOString(), ...d })); save([...load(), ...rs]); return rs; },
    async update(id, d)   { const rs = load().map(r => r.id === id ? { ...r, ...d } : r); save(rs); return rs.find(r => r.id === id); },
    async delete(id)      { save(load().filter(r => r.id !== id)); return { id }; },
  };
}

export const db = {
  auth: {
    async isAuthenticated() { return true; },
    async me() { return { id: "local", name: "Local User", role: "admin" }; },
  },
  entities: {
    AQIRecord:  makeStore("AQIRecord"),
    Prediction: makeStore("Prediction"),
    Alert:      makeStore("Alert"),
  },
};
export default db;

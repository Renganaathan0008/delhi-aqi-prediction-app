import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, Activity, Wind, Droplets, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StationCard from '@/components/aqi/StationCard';
import AlertBanner from '@/components/aqi/AlertBanner';
import { getAQICategory } from '@/utils/aqi';
import { api } from '@/utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#ef4444','#3b82f6','#22c55e','#f97316','#a855f7'];

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [trend, setTrend]       = useState({ data:[], stations:[] });
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [updated, setUpdated]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [sr, tr] = await Promise.all([api.stations(), api.trend()]);
      setStations(sr.stations);
      setTrend(tr);
      setAlerts(sr.stations.filter(s => s.alert).slice(0,3).map((s,i) => ({
        id: String(i), severity: s.aqi>400 ? 'critical' : 'warning',
        station: s.station,
        message: `AQI ${s.aqi} (${s.category}) — ${s.aqi>400 ? 'Avoid all outdoor activity.' : 'Limit outdoor exposure.'}`
      })));
      setUpdated(new Date());
    } catch { setError('Cannot connect to backend. Ensure Flask is running on http://localhost:5000'); }
    finally { setLoading(false); }
  }

  const avg   = stations.length ? Math.round(stations.reduce((s,x) => s+x.aqi, 0)/stations.length) : 0;
  const worst = stations[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-grotesk font-bold text-foreground">Air Quality Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Delhi NCR · {updated ? `Updated ${updated.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading?'animate-spin':''}`} /> Refresh
          </Button>
          <Link to="/predict"><Button size="sm">Predict AQI <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Button></Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {alerts.map(a => <AlertBanner key={a.id} alert={a} onDismiss={() => setAlerts(p => p.filter(x => x.id!==a.id))} />)}

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Avg AQI',         value:avg,                       sub:getAQICategory(avg),    icon:Activity     },
            { label:'Worst Station',   value:worst?.aqi||'—',           sub:worst?.station||'',     icon:Wind         },
            { label:'Stations Active', value:`${stations.length}/${stations.length}`, sub:'All online', icon:Droplets },
            { label:'Severe Alerts',   value:alerts.length||0,          sub:'AQI > 300',            icon:AlertTriangle},
          ].map(({label,value,sub,icon:Icon}) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-grotesk font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="grid md:grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="bg-card rounded-2xl border h-32 animate-pulse"/>)}</div>}

      {!loading && !error && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Live Station Data ({stations.length} stations)
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stations.map(s => <StationCard key={s.station} {...s} onClick={()=>{}} />)}
          </div>
        </div>
      )}

      {!loading && !error && trend.data.length>0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-grotesk font-semibold text-foreground">AQI Trend — Real Dataset</h2>
            <Link to="/trends" className="text-xs text-primary hover:underline flex items-center gap-1">
              Full trends <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend.data} margin={{top:5,right:10,left:-10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} interval={7} />
              <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} />
              <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:8,fontSize:12}} />
              <Legend wrapperStyle={{fontSize:10}} />
              {trend.stations.map((s,i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i%COLORS.length]}
                  strokeWidth={2} dot={false} name={s.replace(', Delhi','')} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

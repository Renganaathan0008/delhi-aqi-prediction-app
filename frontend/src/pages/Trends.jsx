import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Trends() {
  const [stationList, setStationList] = useState([]);
  const [station, setStation]         = useState('');
  const [trend, setTrend]             = useState([]);
  const [hourly, setHourly]           = useState([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    api.stations().then(r => { setStationList(r.stations.map(s=>s.station)); setStation(r.stations[0]?.station||''); });
    api.hourly().then(r => setHourly(r.data));
  }, []);

  useEffect(() => {
    if (!station) return;
    setLoading(true);
    api.trend(station).then(r => setTrend(r.data)).finally(() => setLoading(false));
  }, [station]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-grotesk font-bold text-foreground">AQI Trends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real data from delhi.csv</p>
        </div>
        <select value={station} onChange={e=>setStation(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground">
          {stationList.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-foreground mb-4">{station} — AQI (48 readings)</h2>
        {loading ? <div className="h-52 animate-pulse bg-secondary rounded-xl"/> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{top:5,right:10,left:-10,bottom:5}}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} interval={7}/>
              <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}}/>
              <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:8,fontSize:12}}/>
              <ReferenceLine y={200} stroke="#eab308" strokeDasharray="4 2" label={{value:'Moderate',fill:'#eab308',fontSize:10}}/>
              <ReferenceLine y={300} stroke="#ef4444" strokeDasharray="4 2" label={{value:'Poor',fill:'#ef4444',fontSize:10}}/>
              <Area type="monotone" dataKey="AQI" stroke="#3b82f6" strokeWidth={2} fill="url(#g)"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && trend.length>0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-4">PM2.5 &amp; PM10</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[{k:'pm25',label:'PM2.5',color:'#ef4444'},{k:'pm10',label:'PM10',color:'#f97316'}].map(p=>(
              <div key={p.k}>
                <p className="text-xs text-muted-foreground mb-2">{p.label} (µg/m³)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={trend.slice(-16)} margin={{top:0,right:5,left:-25,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="label" tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}} interval={3}/>
                    <YAxis tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}}/>
                    <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:6,fontSize:11}}/>
                    <Bar dataKey={p.k} fill={p.color} radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {hourly.length>0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-1">Avg AQI by Hour (Full Dataset)</h2>
          <p className="text-xs text-muted-foreground mb-4">Computed from 201,664 real readings</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hourly} margin={{top:5,right:10,left:-10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="hour" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}}
                tickFormatter={h=>`${String(h).padStart(2,'0')}:00`}/>
              <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}}/>
              <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:8,fontSize:12}}
                labelFormatter={h=>`${String(h).padStart(2,'0')}:00`}/>
              <Line type="monotone" dataKey="avg_aqi" stroke="#a855f7" strokeWidth={2.5} dot={{r:4}} name="Avg AQI"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

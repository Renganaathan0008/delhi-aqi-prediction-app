import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getAQIColor } from '@/utils/aqi';
import StationCard from '@/components/aqi/StationCard';
import AQIGauge from '@/components/aqi/AQIGauge';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { X, GitCompare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATION_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7'];
const POLLUTANT_LABELS = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', co: 'CO', so2: 'SO₂' };

export default function Stations() {
  const [stations, setStations]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [trend, setTrend]         = useState([]);
  const [allTrends, setAllTrends] = useState({});
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.stations()
      .then(r => {
        setStations(r.stations);
        r.stations.forEach(s => {
          api.trend(s.station)
            .then(tr => setAllTrends(prev => ({ ...prev, [s.station]: tr.data })))
            .catch(() => {});
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function select(s) {
    if (selected === s) { setSelected(null); setTrend([]); return; }
    setSelected(s);
    api.trend(s).then(r => setTrend(r.data)).catch(() => setTrend([]));
  }

  const sel = stations.find(s => s.station === selected);
  const shortName = name => name.replace(', Delhi', '').replace(' - DPCC', '');

  const aqiCompareData = stations.map((s, i) => ({
    name: shortName(s.station),
    fullName: s.station,
    aqi: s.aqi,
    color: STATION_COLORS[i % STATION_COLORS.length],
  }));

  const pollutantCompare = Object.keys(POLLUTANT_LABELS).map(key => {
    const row = { pollutant: POLLUTANT_LABELS[key] };
    stations.forEach(s => { row[shortName(s.station)] = s.pollutants[key] || 0; });
    return row;
  });

  const stationShortNames = stations.map(s => shortName(s.station));

  const trendLabels = [...new Set(Object.values(allTrends).flatMap(d => d.map(r => r.label)))].sort();
  const mergedTrend = trendLabels.slice(-30).map(label => {
    const row = { label };
    Object.entries(allTrends).forEach(([station, data]) => {
      const pt = data.find(d => d.label === label);
      if (pt) row[shortName(station)] = pt.AQI;
    });
    return row;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-grotesk font-bold text-foreground">Station Comparison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading ? 'Loading…' : `${stations.length} AQI monitoring stations across Delhi NCR — cross-station analysis`}
        </p>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-card rounded-2xl border h-32 animate-pulse" />)}
        </div>
      )}

      {!loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stations.map(s => (
            <StationCard key={s.station} {...s} onClick={() => select(s.station)} />
          ))}
        </div>
      )}

      {/* Cross-station AQI bar chart */}
      {!loading && stations.length > 1 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Cross-Station AQI Comparison</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Latest AQI readings across all {stations.length} monitoring stations — identifies spatial variation in Delhi's pollution levels.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aqiCompareData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v, _, props) => [v, props.payload?.fullName || '']}
              />
              <Bar dataKey="aqi" radius={[4,4,0,0]}>
                {aqiCompareData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pollutant comparison */}
      {!loading && stations.length > 1 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-1">Pollutant Levels by Station</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Side-by-side comparison of key pollutants across all stations — reveals which stations have elevated specific pollutant contributions.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pollutantCompare} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="pollutant" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stationShortNames.map((name, i) => (
                <Bar key={name} dataKey={name} fill={STATION_COLORS[i % STATION_COLORS.length]} radius={[2,2,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Multi-station trend */}
      {!loading && mergedTrend.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">AQI Trend — All Stations (Last 30 Days)</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Daily average AQI per station over time. Diverging trends indicate localised pollution events; correlated spikes suggest city-wide episodes such as crop-burning season.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mergedTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stationShortNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={STATION_COLORS[i % STATION_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Readings table */}
      {!loading && stations.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 overflow-x-auto">
          <h2 className="font-semibold text-foreground mb-4">All Stations — Latest Readings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Station','AQI','PM2.5','PM10','NO₂','Temp','Humidity','Wind'].map(h => (
                  <th key={h} className={`py-2 px-3 text-xs text-muted-foreground font-medium ${h==='Station'?'text-left':'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.station} onClick={() => select(s.station)}
                  className={`border-b border-border/50 cursor-pointer hover:bg-secondary/50 ${selected===s.station?'bg-secondary/70':''}`}>
                  <td className="py-2 px-3 text-xs font-medium text-foreground">{s.station}</td>
                  <td className="text-right py-2 px-3 text-sm font-bold" style={{color:getAQIColor(s.category)}}>{s.aqi}</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.pm25}</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.pm10}</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.no2}</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.temp}°C</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.humidity}%</td>
                  <td className="text-right py-2 px-3 text-xs">{s.pollutants.wind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single station drill-down */}
      {sel && (
        <div className="bg-card rounded-2xl border border-primary/30 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-grotesk font-semibold text-foreground">{sel.station}</h2>
            <Button variant="ghost" size="sm" onClick={() => {setSelected(null);setTrend([]);}}>
              <X className="w-4 h-4"/>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <AQIGauge aqi={sel.aqi} size="lg"/>
              <p className="text-sm text-muted-foreground mt-2">{sel.category}</p>
            </div>
            <div className="space-y-2">
              {[['PM2.5',sel.pollutants.pm25,'µg/m³'],['PM10',sel.pollutants.pm10,'µg/m³'],
                ['NO₂',sel.pollutants.no2,'µg/m³'],['CO',sel.pollutants.co,'mg/m³'],
                ['Temp',sel.pollutants.temp,'°C'],['Humidity',sel.pollutants.humidity,'%'],
                ['Wind',sel.pollutants.wind,'m/s']].map(([l,v,u])=>(
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium">{v} {u}</span>
                </div>
              ))}
            </div>
          </div>
          {trend.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Historical Trend</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trend} margin={{top:5,right:10,left:-10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="label" tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}} interval={7}/>
                  <YAxis tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}}/>
                  <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:8,fontSize:11}}/>
                  <Line type="monotone" dataKey="AQI" stroke={getAQIColor(sel.category)} strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

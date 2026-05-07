import { MapPin, AlertTriangle } from 'lucide-react';
import AQIBadge from './AQIBadge';
import { getAQIColor } from '@/utils/aqi';

export default function StationCard({ station, aqi, category, alert, pollutants, onClick }) {
  return (
    <div onClick={onClick} className="bg-card rounded-2xl border border-border p-5 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{station}</span>
        </div>
        {alert && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 ml-1" />}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-grotesk font-bold" style={{color: getAQIColor(category)}}>{aqi}</div>
          <AQIBadge category={category} />
        </div>
        {pollutants && (
          <div className="space-y-1 text-right">
            <div className="text-xs text-muted-foreground">PM2.5: <span className="font-medium text-foreground">{pollutants.pm25}</span></div>
            <div className="text-xs text-muted-foreground">PM10: <span className="font-medium text-foreground">{pollutants.pm10}</span></div>
            <div className="text-xs text-muted-foreground">NO₂: <span className="font-medium text-foreground">{pollutants.no2}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

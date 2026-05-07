import { useState, useEffect } from "react";

import { Bell, CheckCheck, AlertTriangle, Zap, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AQIBadge from "@/components/aqi/AQIBadge";


const SAMPLE_ALERTS = [
  { id: "s1", severity: "critical", station: "Anand Vihar", message: "AQI forecast: Very Poor (295) in next 6 hours. Outdoor activity not recommended.", predicted_aqi: 295, category: "Very Poor", triggered_at: new Date(Date.now() - 3600000).toISOString(), is_read: false },
  { id: "s2", severity: "warning", station: "RK Puram", message: "PM2.5 exceeding safe limit. Currently at 178 µg/m³ (3× safe level).", predicted_aqi: 220, category: "Poor", triggered_at: new Date(Date.now() - 7200000).toISOString(), is_read: false },
  { id: "s3", severity: "warning", station: "Dwarka", message: "Rising AQI trend detected. 15% increase over last 3 hours.", predicted_aqi: 165, category: "Poor", triggered_at: new Date(Date.now() - 10800000).toISOString(), is_read: false },
  { id: "s4", severity: "info", station: "RK Puram", message: "Wind speed increasing — AQI expected to improve in next 2 hours.", predicted_aqi: 130, category: "Poor", triggered_at: new Date(Date.now() - 18000000).toISOString(), is_read: true },
  { id: "s5", severity: "critical", station: "Anand Vihar", message: "Severe pollution event: AQI peaked at 412 yesterday between 19:00–21:00.", predicted_aqi: 412, category: "Severe", triggered_at: new Date(Date.now() - 86400000).toISOString(), is_read: true },
];

const SEV_ICON = { info: Info, warning: AlertTriangle, critical: Zap };
const SEV_STYLE = {
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  critical: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};
const SEV_TEXT = { info: "text-blue-600 dark:text-blue-400", warning: "text-yellow-600 dark:text-yellow-400", critical: "text-red-600 dark:text-red-400" };

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS);
  const [filter, setFilter] = useState("all");

  const unread = alerts.filter(a => !a.is_read).length;

  function markRead(id) {
    setAlerts(p => p.map(a => a.id === id ? { ...a, is_read: true } : a));
  }
  function markAllRead() {
    setAlerts(p => p.map(a => ({ ...a, is_read: true })));
  }
  function remove(id) {
    setAlerts(p => p.filter(a => a.id !== id));
  }

  const filtered = alerts.filter(a => {
    if (filter === "unread") return !a.is_read;
    if (filter === "critical") return a.severity === "critical";
    if (filter === "warning") return a.severity === "warning";
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-grotesk font-bold text-foreground">Alerts & Warnings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{unread} unread alerts</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "critical", "warning"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No alerts in this filter</p>
          </div>
        ) : (
          filtered.map(alert => {
            const Icon = SEV_ICON[alert.severity];
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 transition-opacity ${SEV_STYLE[alert.severity]} ${alert.is_read ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${SEV_TEXT[alert.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${SEV_TEXT[alert.severity]}`}>{alert.station}</span>
                      {alert.category && <AQIBadge category={alert.category} />}
                      {!alert.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(alert.triggered_at)}</span>
                      {!alert.is_read && (
                        <button onClick={() => markRead(alert.id)} className="text-[10px] text-primary hover:underline">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => remove(alert.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
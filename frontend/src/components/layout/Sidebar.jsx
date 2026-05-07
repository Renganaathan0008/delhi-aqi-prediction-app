import { Link, useLocation } from "react-router-dom";
import { Wind, LayoutDashboard, FlaskConical, BarChart3, Bell, Map, Upload, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/predict", label: "Predict AQI", icon: FlaskConical },
  { path: "/trends", label: "Trends", icon: BarChart3 },
  { path: "/stations", label: "Stations", icon: Map },
  { path: "/alerts", label: "Alerts", icon: Bell, badge: true },
  { path: "/results", label: "Model Results", icon: BarChart2 },
  { path: "/admin", label: "Admin Upload", icon: Upload },
];

export default function Sidebar({ alertCount = 0 }) {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-[hsl(220,25%,10%)] flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-[hsl(220,20%,18%)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wind className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-grotesk font-700 text-white text-sm leading-tight">Delhi AQI</p>
            <p className="text-[10px] text-[hsl(220,15%,55%)] uppercase tracking-wider">Prediction System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon, badge }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-primary/20 text-primary"
                  : "text-[hsl(220,15%,60%)] hover:bg-[hsl(220,20%,18%)] hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${active ? "text-primary" : "group-hover:text-white"}`} />
              <span className="flex-1">{label}</span>
              {badge && alertCount > 0 && (
                <Badge className="bg-destructive text-white text-[10px] px-1.5 py-0 h-4 min-w-[16px]">
                  {alertCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[hsl(220,20%,18%)]">
        <p className="text-[10px] text-[hsl(220,15%,40%)] text-center">
          ML + SHAP · Delhi NCR
        </p>
      </div>
    </aside>
  );
}
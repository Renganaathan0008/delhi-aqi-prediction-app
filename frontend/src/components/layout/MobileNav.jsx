import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Wind, Menu, X, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/predict", label: "Predict" },
  { path: "/trends", label: "Trends" },
  { path: "/stations", label: "Stations" },
  { path: "/alerts", label: "Alerts" },
  { path: "/admin", label: "Admin" },
];

export default function MobileNav({ alertCount = 0 }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="lg:hidden bg-[hsl(220,25%,10%)] border-b border-[hsl(220,20%,18%)] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Wind className="w-5 h-5 text-primary" />
        <span className="font-grotesk font-semibold text-white text-sm">Delhi AQI</span>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/alerts" className="relative">
          <Bell className="w-5 h-5 text-[hsl(220,15%,60%)]" />
          {alertCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] px-1 py-0 h-3.5 min-w-[14px]">
              {alertCount}
            </Badge>
          )}
        </Link>
        <Button variant="ghost" size="icon" className="text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {open && (
        <div className="absolute top-14 left-0 right-0 z-50 bg-[hsl(220,25%,10%)] border-b border-[hsl(220,20%,18%)] p-4 space-y-1">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                location.pathname === path
                  ? "bg-primary/20 text-primary"
                  : "text-[hsl(220,15%,60%)] hover:bg-[hsl(220,20%,18%)] hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
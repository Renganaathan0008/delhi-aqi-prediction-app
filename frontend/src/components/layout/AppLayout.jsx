
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { db } from "@/api/base44Client";

export default function AppLayout() {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    db.entities.Alert.filter({ is_read: false }).then(alerts => {
      setAlertCount(alerts.length);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar alertCount={alertCount} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <MobileNav alertCount={alertCount} />

        <main className="flex-1 p-4 lg:p-8 gradient-mesh overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
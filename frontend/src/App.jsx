import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import AppLayout  from "@/components/layout/AppLayout";
import Dashboard  from "@/pages/Dashboard";
import PredictAQI from "@/pages/PredictAQI";
import Trends     from "@/pages/Trends";
import Stations   from "@/pages/Stations";
import Alerts     from "@/pages/Alerts";
import AdminUpload   from "@/pages/AdminUpload";
import ModelResults  from "@/pages/ModelResults";
import PageNotFound from "@/lib/PageNotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/"       element={<Dashboard />} />
              <Route path="/predict" element={<PredictAQI />} />
              <Route path="/trends"  element={<Trends />} />
              <Route path="/stations" element={<Stations />} />
              <Route path="/alerts"  element={<Alerts />} />
              <Route path="/admin"   element={<AdminUpload />} />
              <Route path="/results" element={<ModelResults />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

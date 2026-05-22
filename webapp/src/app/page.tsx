import * as db from "@/lib/db";
import { Shipment } from "@/lib/types";
import { NewShipmentDialog } from "@/components/NewShipmentDialog";
import { ShipmentsList } from "@/components/ShipmentsList";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Cpu, Wifi, Activity } from "lucide-react";

export const revalidate = 0; // Disable static caching so it always gets realtime data

export default async function Dashboard() {
  // Fetch real data (with automatic local mock fallback)
  const shipments = await db.getShipments();
  const statuses = await db.getStatuses();
  const customers = await db.getCustomers();
  const appConfig = await db.getAppConfig();
  const isDemoMode = db.checkIsDemoMode();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-300">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center backdrop-blur-md sticky top-0 z-50 animate-fade-in">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-950"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              DEMO MODE ACTIVE: Supabase database offline. Operating with high-fidelity local memory database.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8 flex-grow">
        
        {/* Terminal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                WCS Operations Terminal
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Integrated Cargo Tracking & Follow-up Middleware • Real-time Airport/Ocean Feed
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t border-slate-800 md:border-none pt-4 md:pt-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              {isDemoMode ? (
                <>
                  <Activity className="w-4 h-4 text-amber-500 animate-spin" />
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">LOCAL DEV MODE</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">CLOUD ONLINE</span>
                </>
              )}
            </div>
            <NewShipmentDialog customers={customers} />
          </div>
        </div>

        {/* shipments interactive list */}
        <ShipmentsList 
          initialShipments={shipments} 
          statuses={statuses} 
          initialCustomers={customers}
          initialConfig={appConfig}
        />

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600">
        <p>© 2026 WCS Tracker. All systems operational.</p>
      </footer>
    </div>
  );
}

import * as db from "@/lib/db";
import { Shipment, Task, Ratesheet } from "@/lib/types";
import { 
  ShieldAlert, Cpu, ArrowRight, Layers, FileText, CheckSquare, 
  DollarSign, Plane, Ship, Truck, Calendar, Activity, AlertCircle, Clock 
} from "lucide-react";
import Link from "next/link";

export const revalidate = 0; // Disable static caching so it always gets realtime data

export default async function LandingHub() {
  // Fetch real data from all modules (with automatic local fallbacks)
  const shipments = await db.getShipments();
  const tasks = await db.getTasks();
  const ratesheets = await db.getRatesheets();
  const isDemoMode = db.checkIsDemoMode();

  // 1. Operations Stats
  const activeShipments = shipments.filter(s => s.status?.name !== "Closed" && s.status?.name !== "Cancelled");
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
  const todayAlertsCount = shipments.filter(s => s.eta === todayStr || s.etd === todayStr).length;
  const totalSubfiles = shipments.filter(s => s.parent_shipment_id !== null).length;

  // 2. Tasks Stats
  const pendingTasks = tasks.filter(t => t.status !== "Completed");
  const completedTasks = tasks.filter(t => t.status === "Completed");
  const tasksDueToday = tasks.filter(t => t.deadline === todayStr && t.status !== "Completed").length;

  // 3. Ratesheets Stats
  const baseRatesheet = ratesheets.find(r => r.client_name === null);
  const totalBaseRates = baseRatesheet ? baseSheetRateCount(baseRatesheet) : 0;
  const clientRatesheetsCount = ratesheets.filter(r => r.client_name !== null).length;

  function baseSheetRateCount(sheet: Ratesheet) {
    return sheet.rates?.length || 0;
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-yellow-500/30 selection:text-yellow-300">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center backdrop-blur-md sticky top-0 z-50 animate-fade-in">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-950"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-amber-300 flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              DEMO MODE ACTIVE: Database operating in high-fidelity local memory filesystem.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-12 flex-grow flex flex-col justify-center">
        
        {/* Core Branding Hub Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-550/10 border border-yellow-500/25 text-yellow-500 text-xs font-mono font-black uppercase tracking-widest animate-pulse">
            <Cpu className="w-4 h-4 shrink-0" />
            WCS Control Hub Middleware
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 font-mono uppercase">
            WORLD CLASS SOLUTIONS
          </h1>
          <p className="text-sm text-slate-450 font-medium leading-relaxed">
            Welcome to the integrated cargo middleware terminal. Select an application module below to manage cargo logistics, tasks workflows, or billing sheets.
          </p>
        </div>

        {/* 3 APP NAVIGATION CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* CARD 1: OPERATIONS TERMINAL */}
          <div className="group bg-[#0a0a0c] border border-slate-900 rounded-2xl overflow-hidden hover:border-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/5 transition-all duration-300 flex flex-col relative h-[380px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-yellow-500/10 transition-colors" />
            <div className="h-2 bg-yellow-500" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-widest">Active Dispatch Board</span>
                <h2 className="text-xl font-black text-white font-mono uppercase">Operations Terminal</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Real-time tracking of import/export cargo shipments. Manage operational logs, pre-billing pre-invoices, and split arrivals.
              </p>

              {/* KPI Summaries list */}
              <div className="flex-grow space-y-2 border-t border-slate-900 pt-4 text-[11px] font-mono font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Active Shipments:</span>
                  <span className="text-yellow-500 font-bold">{activeShipments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Split Sub-parts:</span>
                  <span className="text-indigo-400 font-bold">{totalSubfiles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Today Arrivals/Departures:</span>
                  {todayAlertsCount > 0 ? (
                    <span className="bg-rose-950/60 text-rose-400 border border-rose-900/50 px-2 py-0.5 rounded font-black text-[10px] animate-pulse">
                      {todayAlertsCount} Today
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold">None</span>
                  )}
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/operations"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10"
              >
                Enter Terminal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CARD 2: TASK TRACKER */}
          <div className="group bg-[#0a0a0c] border border-slate-900 rounded-2xl overflow-hidden hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col relative h-[380px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
            <div className="h-2 bg-indigo-500" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">Workflow Management</span>
                <h2 className="text-xl font-black text-white font-mono uppercase">Tasks Tracker</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Collaborative todo lists and Kanban boards. Track dispatch deadlines, coordinate custom clearances, and copy quick reminders.
              </p>

              {/* KPI Summaries list */}
              <div className="flex-grow space-y-2 border-t border-slate-900 pt-4 text-[11px] font-mono font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Pending Tasks:</span>
                  <span className="text-indigo-400 font-bold">{pendingTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed Tasks:</span>
                  <span className="text-emerald-500 font-bold">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Due Today / Overdue:</span>
                  {tasksDueToday > 0 ? (
                    <span className="bg-rose-950/60 text-rose-450 border border-rose-900/50 px-2 py-0.5 rounded font-black text-[10px] animate-pulse animate-bounce">
                      {tasksDueToday} Priority
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold">None</span>
                  )}
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/task-tracker"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/10"
              >
                Open Tasks
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CARD 3: RATESHEET TRACKER */}
          <div className="group bg-[#0a0a0c] border border-slate-900 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col relative h-[380px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="h-2 bg-emerald-500" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-mono text-emerald-450 font-bold uppercase tracking-widest">Base costs & catalogs</span>
                <h2 className="text-xl font-black text-white font-mono uppercase">Ratesheet Tracker</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Warehouse storage, air, ocean, bonded CFS, courier, and fulfillment base costs. Manage customized client sheets with mass markups.
              </p>

              {/* KPI Summaries list */}
              <div className="flex-grow space-y-2 border-t border-slate-900 pt-4 text-[11px] font-mono font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Base Rates Count:</span>
                  <span className="text-emerald-400 font-bold">{totalBaseRates} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Client-Specific Sheets:</span>
                  <span className="text-slate-350 font-bold">{clientRatesheetsCount} sheets</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mass Markup Tool:</span>
                  <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px]">Enabled</span>
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/ratesheet-tracker"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10"
              >
                Access Ratesheets
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

        {/* PUBLIC PORTAL PROMOTION BANNER */}
        <div className="bg-[#050507] border border-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-md">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-4 h-4 text-sky-400" />
              Public Client Tracking Portal
            </h3>
            <p className="text-xs text-slate-400">
              Provide your clients with public file tracking without disclosing private cost items and staff logs.
            </p>
          </div>
          <Link 
            href="/portal" 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-sky-400 hover:text-sky-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shrink-0"
          >
            Open Public Portal
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-black py-8 text-center text-xs text-slate-600 font-mono tracking-wider uppercase">
        <p>© 2026 WCS Tracker Middleware. All operational systems online.</p>
      </footer>
    </div>
  );
}

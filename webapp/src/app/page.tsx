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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-[#FDF8EE] border-b border-[#E6C573]/50 px-4 py-3 text-center sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E6C573] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4A843]"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-[#8A6F2E] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Demo Mode Active — Database operating in local memory filesystem.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-12 flex-grow flex flex-col justify-center">
        
        {/* Core Branding Hub Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF1EE] border border-[#F0C5BC] text-[#8B4E43] text-xs font-semibold uppercase tracking-widest">
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            WCS Control Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-wide text-foreground">
            World Class Solutions
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to the integrated cargo middleware terminal. Select an application module below to manage cargo logistics, tasks workflows, or billing sheets.
          </p>
        </div>

        {/* 3 APP NAVIGATION CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          
          {/* CARD 1: OPERATIONS TERMINAL */}
          <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#F0C5BC] transition-all duration-300 flex flex-col relative h-[370px]">
            <div className="h-1.5 bg-[#E8A99A]" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-semibold text-[#8B4E43] uppercase tracking-widest">Active Dispatch Board</span>
                <h2 className="text-lg font-bold text-foreground">Operations Terminal</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Real-time tracking of import/export cargo shipments. Manage operational logs, pre-billing pre-invoices, and split arrivals.
              </p>

              {/* KPI Summaries */}
              <div className="flex-grow space-y-2 border-t border-border pt-4 text-[11px] font-semibold text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Active Shipments:</span>
                  <span className="text-[#8B4E43] font-bold bg-[#FDF1EE] px-2 py-0.5 rounded-md">{activeShipments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Split Sub-parts:</span>
                  <span className="text-[#5A4F7A] font-bold bg-[#F2F0F8] px-2 py-0.5 rounded-md">{totalSubfiles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Today Arrivals/Departures:</span>
                  {todayAlertsCount > 0 ? (
                    <span className="bg-[#FDF1EE] text-[#8B4E43] border border-[#F0C5BC] px-2 py-0.5 rounded font-bold text-[10px] animate-pulse">
                      {todayAlertsCount} Today
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-bold">None</span>
                  )}
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/operations"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#E8A99A] hover:bg-[#D4907F] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm shadow-[#E8A99A]/30"
              >
                Enter Terminal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CARD 2: TASK TRACKER */}
          <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#C8C0E0] transition-all duration-300 flex flex-col relative h-[370px]">
            <div className="h-1.5 bg-[#A89ACC]" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-semibold text-[#5A4F7A] uppercase tracking-widest">Workflow Management</span>
                <h2 className="text-lg font-bold text-foreground">Tasks Tracker</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Collaborative todo lists and Kanban boards. Track dispatch deadlines, coordinate custom clearances, and copy quick reminders.
              </p>

              {/* KPI Summaries */}
              <div className="flex-grow space-y-2 border-t border-border pt-4 text-[11px] font-semibold text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Pending Tasks:</span>
                  <span className="text-[#5A4F7A] font-bold bg-[#F2F0F8] px-2 py-0.5 rounded-md">{pendingTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed Tasks:</span>
                  <span className="text-[#3D6E61] font-bold bg-[#EEF6F3] px-2 py-0.5 rounded-md">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Due Today / Overdue:</span>
                  {tasksDueToday > 0 ? (
                    <span className="bg-[#FDF1EE] text-[#8B4E43] border border-[#F0C5BC] px-2 py-0.5 rounded font-bold text-[10px] animate-pulse">
                      {tasksDueToday} Priority
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-bold">None</span>
                  )}
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/task-tracker"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#A89ACC] hover:bg-[#9080BA] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm shadow-[#A89ACC]/30"
              >
                Open Tasks
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CARD 3: RATESHEET TRACKER */}
          <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#B0D4C8] transition-all duration-300 flex flex-col relative h-[370px]">
            <div className="h-1.5 bg-[#7BB5A0]" />
            <div className="p-6 flex flex-col flex-grow">
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-semibold text-[#3D6E61] uppercase tracking-widest">Base costs & catalogs</span>
                <h2 className="text-lg font-bold text-foreground">Ratesheet Tracker</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Warehouse storage, air, ocean, bonded CFS, courier, and fulfillment base costs. Manage customized client sheets with mass markups.
              </p>

              {/* KPI Summaries */}
              <div className="flex-grow space-y-2 border-t border-border pt-4 text-[11px] font-semibold text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Base Rates Count:</span>
                  <span className="text-[#3D6E61] font-bold bg-[#EEF6F3] px-2 py-0.5 rounded-md">{totalBaseRates} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Client-Specific Sheets:</span>
                  <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded-md">{clientRatesheetsCount} sheets</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mass Markup Tool:</span>
                  <span className="text-[#3D6E61] font-bold text-[9px] uppercase tracking-widest">Enabled</span>
                </div>
              </div>

              {/* Button */}
              <Link 
                href="/ratesheet-tracker"
                className="mt-6 inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#7BB5A0] hover:bg-[#5E9E89] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm shadow-[#7BB5A0]/30"
              >
                Access Ratesheets
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

        {/* PUBLIC PORTAL PROMOTION BANNER */}
        <div className="bg-[#EEF5FA] border border-[#B0D0E8] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#8BBAD4]" />
              Public Client Tracking Portal
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide your clients with public file tracking without disclosing private cost items and staff logs.
            </p>
          </div>
          <Link 
            href="/portal" 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#B0D0E8] hover:border-[#8BBAD4] hover:bg-[#EEF5FA] text-[#3A6580] font-bold rounded-xl text-xs uppercase tracking-wider transition-all shrink-0"
          >
            Open Public Portal
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground tracking-wider">
        <p>© 2026 WCS Tracker · All operational systems online.</p>
      </footer>
    </div>
  );
}

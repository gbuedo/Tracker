import * as db from "@/lib/db";
import { Task } from "@/lib/types";
import { ArrowLeft, CheckSquare, Clipboard, Layers, Cpu, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { TaskTrackerClient } from "./TaskTrackerClient";

export const revalidate = 0; // Disable static caching

export default async function TaskTrackerPage() {
  const tasks = await db.getTasks();
  const isDemoMode = db.checkIsDemoMode();

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-300">
      
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
              DEMO MODE ACTIVE: Operating with local memory database. All tasks updates are stored locally.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8 flex-grow">
        
        {/* Terminal Header (Airport Board Style) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0a0c] border-t-4 border-indigo-500 border-x border-b border-slate-900 p-6 rounded-xl relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 flex-grow">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <CheckSquare className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-widest text-indigo-400 uppercase font-mono truncate">
                WCS TASK TRACKER
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-2.5 py-1 rounded border border-slate-850 hover:border-slate-700 text-[10px] font-extrabold uppercase tracking-wide transition-all shadow-sm">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Menu
              </Link>
              <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">
                Operations Todo & Workflow Coordinator middleware
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t border-slate-900 md:border-none pt-4 md:pt-0">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-black border border-slate-900 font-mono shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                TASKS FLOW FEED ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Client component holding state */}
        <TaskTrackerClient initialTasks={tasks} />

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-black py-6 text-center text-xs text-slate-600 font-mono tracking-wider uppercase">
        <p>© 2026 WCS Tracker. All systems operational.</p>
      </footer>
    </div>
  );
}

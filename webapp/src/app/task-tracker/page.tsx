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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-[#FDF8EE] border-b border-[#E6C573]/50 px-4 py-3 text-center sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E6C573] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4A843]"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-[#8A6F2E] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Demo Mode Active — Operating with local memory database. All task updates are stored locally.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8 flex-grow">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border border-l-4 border-l-[#A89ACC] p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#A89ACC]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 flex-grow">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F2F0F8] border border-[#C8C0E0] flex items-center justify-center text-[#5A4F7A] shrink-0">
                <CheckSquare className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-wide truncate">
                WCS Task Tracker
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-1 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border text-[10px] font-semibold uppercase tracking-wide transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Menu
              </Link>
              <p className="text-xs text-muted-foreground tracking-wide">
                Operations Todo & Workflow Coordinator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t border-border md:border-none pt-4 md:pt-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border font-mono shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#A89ACC] animate-ping shrink-0" />
              <span className="text-[10px] font-bold text-[#5A4F7A] uppercase tracking-widest">
                TASKS FLOW ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Client component holding state */}
        <TaskTrackerClient initialTasks={tasks} />

      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground tracking-wider">
        <p>© 2026 WCS Tracker · All systems operational.</p>
      </footer>
    </div>
  );
}

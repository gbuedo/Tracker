"use client";

import React, { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { getTasksAction, toggleTaskCompleteWithRolloverAction } from "@/actions/tasks";
import { 
  ShieldAlert, Flame, RefreshCw, ExternalLink, Check, Circle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  initialTasks?: Task[];
}

export function GlobalExpirationHeader({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const router = useRouter();

  const loadLatestTasks = async () => {
    try {
      const latest = await getTasksAction();
      if (latest && latest.length > 0) {
        setTasks(latest);
      }
    } catch (err) {
      console.error("Failed to load tasks in GlobalExpirationHeader:", err);
    }
  };

  useEffect(() => {
    loadLatestTasks();
  }, []);

  const handleToggleComplete = async (taskId: number) => {
    setLoadingTaskId(taskId);
    try {
      const updated = await toggleTaskCompleteWithRolloverAction(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      await loadLatestTasks();
      router.refresh();
    } catch (err) {
      console.error("Failed to complete expiration task:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter Expiration Tasks (task_type === 'expiration' and status !== 'Completed')
  const expirationTasks = tasks.filter(t => t.task_type === "expiration" && t.status !== "Completed");

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  const getDaysDiff = (dueDateStr?: string | null) => {
    if (!dueDateStr) return 999;
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - todayDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // User requested sequence: 1 Previous (Overdue), Current Next, and 2 After Current
  
  // 1. 1 Previous Overdue Item (due_date < today)
  const overdueItems = expirationTasks
    .filter(t => getDaysDiff(t.due_date || t.deadline) < 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline))
    .slice(0, 1);

  // 2. Upcoming Items (due_date >= today)
  const sortedUpcoming = expirationTasks
    .filter(t => getDaysDiff(t.due_date || t.deadline) >= 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline));

  const currentNext = sortedUpcoming.slice(0, 1); // Current Next
  const next2After = sortedUpcoming.slice(1, 3);  // 2 After Current

  const displayItems = [
    ...overdueItems.map(item => ({ ...item, isOverdueItem: true })),
    ...currentNext.map(item => ({ ...item, isCurrentNextItem: true })),
    ...next2After.map(item => ({ ...item, isAfterNextItem: true }))
  ];

  if (expirationTasks.length === 0) return null;

  return (
    <div className="bg-slate-950 text-slate-100 border-b border-rose-950/80 sticky top-0 z-50 shadow-lg font-sans select-none text-xs">
      
      {/* COMPACT DAILY EXPIRATION ALERT BAR */}
      <div className="max-w-7xl mx-auto px-3 py-1 flex flex-col md:flex-row items-center justify-between gap-2">
        
        {/* BRANDING BADGE */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider text-[10px] shadow-sm animate-pulse">
            <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>DAILY EXPIRATION ALERTS</span>
          </div>
        </div>

        {/* ITEMS CAROUSEL / ROW WITH BIG COUNTDOWN NUMBERS */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 max-w-full overflow-x-auto py-0.5">
          {displayItems.map(item => {
            const daysLeft = getDaysDiff(item.due_date || item.deadline);
            const isOverdue = daysLeft < 0;
            const isToday = daysLeft === 0;

            let cardBg = "bg-slate-900 border-slate-700/80 text-slate-100";
            let numberBg = "bg-slate-800 text-sky-300 border-slate-700";
            let labelText = "DAYS LEFT";

            if (isOverdue) {
              cardBg = "bg-rose-950/90 border-rose-600/90 text-rose-100 shadow-sm";
              numberBg = "bg-rose-600 text-white border-rose-400 font-black animate-bounce";
              labelText = "OVERDUE";
            } else if (isToday) {
              cardBg = "bg-amber-950/90 border-amber-500/90 text-amber-100";
              numberBg = "bg-amber-500 text-slate-950 border-amber-300 font-black animate-pulse";
              labelText = "DUE TODAY";
            } else if ("isCurrentNextItem" in item && item.isCurrentNextItem) {
              cardBg = "bg-[#1E293B] border-sky-500/70 text-slate-100 shadow-sm";
              numberBg = "bg-sky-500 text-slate-950 border-sky-300 font-black";
              labelText = "NEXT";
            }

            return (
              <div 
                key={item.id}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] transition-all shrink-0 ${cardBg}`}
              >
                {/* Radio Button to Mark Complete & Rollover */}
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  disabled={loadingTaskId === item.id}
                  className="group relative focus:outline-none shrink-0"
                  title="Radio button: Complete occurrence and auto-rollover to next cycle"
                >
                  {loadingTaskId === item.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 group-hover:border-emerald-400 group-hover:bg-emerald-500/20 transition-all flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-emerald-400" />
                    </div>
                  )}
                </button>

                {/* COUNTDOWN NUMBER BADGE */}
                <div className={`flex items-center justify-center px-1.5 py-0.5 rounded font-mono text-[11px] font-black border leading-none shrink-0 gap-1 ${numberBg}`}>
                  <span>{isOverdue ? Math.abs(daysLeft) : isToday ? "0" : daysLeft}d</span>
                  <span className="text-[7.5px] uppercase font-bold tracking-tighter opacity-90">{labelText}</span>
                </div>

                {/* Title & Category */}
                <div className="flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-[200px]">
                  <span className="font-bold text-slate-100 truncate text-[10.5px] leading-tight">{item.title}</span>
                  {item.category && (
                    <span className="text-[8.5px] font-bold bg-slate-800 text-amber-300 px-1 py-0.25 rounded border border-slate-700 uppercase shrink-0">
                      {item.category}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* LINK TO TASK TRACKER EXPIRATIONS TAB */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/task-tracker?tab=expirations"
            className="flex items-center gap-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider border border-rose-500/40 transition-colors"
          >
            <span>All ({expirationTasks.length})</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </Link>
        </div>

      </div>

    </div>
  );
}

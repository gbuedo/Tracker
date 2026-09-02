"use client";

import React, { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { getTasksAction, toggleTaskCompleteWithRolloverAction } from "@/actions/tasks";
import { 
  ShieldAlert, Calendar, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, 
  AlertTriangle, Bell, Sparkles, RefreshCw, FileText, ExternalLink
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialTasks?: Task[];
}

export function GlobalExpirationHeader({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);

  // Sync tasks on mount or polling
  useEffect(() => {
    if (!initialTasks || initialTasks.length === 0) {
      getTasksAction().then(res => setTasks(res));
    }
  }, [initialTasks]);

  const handleToggleComplete = async (taskId: number) => {
    setLoadingTaskId(taskId);
    try {
      const updated = await toggleTaskCompleteWithRolloverAction(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error("Failed to complete expiration task:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter Expiration Tasks
  const expirationTasks = tasks.filter(t => t.task_type === "expiration" && t.status !== "Completed");

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  const getDaysDiff = (dueDateStr?: string | null) => {
    if (!dueDateStr) return 999;
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - todayDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Overdue Items (due_date < today) - sort by oldest due date first (up to 2)
  const overdueItems = expirationTasks
    .filter(t => getDaysDiff(t.due_date || t.deadline) < 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline))
    .slice(0, 2);

  // 2. Upcoming Items (due_date >= today) - sort by closest due date first (up to 3)
  const upcomingItems = expirationTasks
    .filter(t => getDaysDiff(t.due_date || t.deadline) >= 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline))
    .slice(0, 3);

  const displayItems = [...overdueItems, ...upcomingItems];

  if (expirationTasks.length === 0) return null;

  return (
    <div className="bg-slate-950 text-slate-100 border-b border-slate-800 sticky top-0 z-50 shadow-md font-sans text-xs select-none">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex flex-col md:flex-row items-center justify-between gap-2">
        
        {/* LEFT BRANDING BADGE */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Expirations Alert</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden lg:inline">
            Priority Certifications & Renewals Agenda
          </span>
        </div>

        {/* CENTER ITEMS CAROUSEL / ROW */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 overflow-x-auto py-0.5 max-w-full">
          {displayItems.map(item => {
            const daysLeft = getDaysDiff(item.due_date || item.deadline);
            const isOverdue = daysLeft < 0;
            const isToday = daysLeft === 0;

            let badgeBg = "bg-sky-500/20 text-sky-300 border-sky-500/40";
            let daysText = `In ${daysLeft} days`;

            if (isOverdue) {
              badgeBg = "bg-rose-600 text-white border-rose-400 font-extrabold animate-bounce";
              daysText = `Overdue ${Math.abs(daysLeft)}d`;
            } else if (isToday) {
              badgeBg = "bg-amber-500 text-slate-950 font-black animate-pulse";
              daysText = "Due Today!";
            } else if (daysLeft <= 7) {
              badgeBg = "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
            }

            return (
              <div 
                key={item.id}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] transition-all shrink-0 ${
                  isOverdue 
                    ? "bg-rose-950/60 border-rose-600/60 text-rose-100 shadow-sm shadow-rose-900/50" 
                    : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-500"
                }`}
              >
                {/* Radio Button to Complete */}
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  disabled={loadingTaskId === item.id}
                  className="group relative focus:outline-none shrink-0"
                  title="Mark as completed & auto-rollover to next recurrence period"
                >
                  {loadingTaskId === item.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  )}
                </button>

                {/* Days Remaining Large Badge */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border ${badgeBg}`}>
                  {daysText}
                </span>

                {/* Title & Category */}
                <div className="flex items-center gap-1.5 truncate max-w-[200px] md:max-w-[240px]">
                  <span className="font-bold text-slate-100 truncate">{item.title}</span>
                  {item.category && (
                    <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1 py-0.25 rounded border border-slate-700 uppercase shrink-0">
                      {item.category}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT LINK TO TASKS MODULE */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/task-tracker"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-700 transition-colors"
          >
            <span>All Tasks ({expirationTasks.length})</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </Link>
        </div>

      </div>
    </div>
  );
}

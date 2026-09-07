"use client";

import React, { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { getTasksAction, toggleTaskCompleteWithRolloverAction } from "@/actions/tasks";
import { getExactDaysRemaining } from "@/lib/utils";
import { 
  ShieldAlert, Flame, RefreshCw, ExternalLink, Check, Circle, 
  X, Calendar, Clock, AlertTriangle, ChevronRight, Repeat, User, FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  initialTasks?: Task[];
}

export function GlobalExpirationHeader({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const router = useRouter();

  const loadLatestTasks = async () => {
    setIsRefreshing(true);
    try {
      const latest = await getTasksAction();
      if (latest && latest.length > 0) {
        setTasks(latest);
      }
    } catch (err) {
      console.error("Failed to load tasks in GlobalExpirationHeader:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLatestTasks();
    const handleSync = () => {
      loadLatestTasks();
    };
    window.addEventListener("wcs:tasks-updated", handleSync);
    return () => {
      window.removeEventListener("wcs:tasks-updated", handleSync);
    };
  }, []);

  const handleToggleComplete = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    setLoadingTaskId(taskId);
    try {
      const updated = await toggleTaskCompleteWithRolloverAction(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
      await loadLatestTasks();
      window.dispatchEvent(new CustomEvent("wcs:tasks-updated"));
      router.refresh();
    } catch (err) {
      console.error("Failed to complete expiration task:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter Expiration Tasks (task_type === 'expiration' and status !== 'Completed')
  const expirationTasks = tasks.filter(t => t.task_type === "expiration" && t.status !== "Completed");

  // Group into 3 Structured Rows:
  // Row 1: Overdue (< 0 days) & Due Today (=== 0 days)
  const row1Items = expirationTasks
    .filter(t => getExactDaysRemaining(t.due_date || t.deadline) <= 0)
    .sort((a, b) => getExactDaysRemaining(a.due_date || a.deadline) - getExactDaysRemaining(b.due_date || b.deadline));

  // Row 2: Upcoming Short-Term (1 to 30 days)
  const row2Items = expirationTasks
    .filter(t => {
      const d = getExactDaysRemaining(t.due_date || t.deadline);
      return d > 0 && d <= 30;
    })
    .sort((a, b) => getExactDaysRemaining(a.due_date || a.deadline) - getExactDaysRemaining(b.due_date || b.deadline));

  // Row 3: Future & Long-Term Cycles (> 30 days)
  const row3Items = expirationTasks
    .filter(t => getExactDaysRemaining(t.due_date || t.deadline) > 30)
    .sort((a, b) => getExactDaysRemaining(a.due_date || a.deadline) - getExactDaysRemaining(b.due_date || b.deadline));

  if (expirationTasks.length === 0) return null;

  const renderBadgeItem = (item: Task) => {
    const daysLeft = getExactDaysRemaining(item.due_date || item.deadline);
    const isOverdue = daysLeft < 0;
    const isToday = daysLeft === 0;

    let cardBg = "bg-slate-900 border-slate-700/80 text-slate-100 hover:border-slate-500";
    let numberBg = "bg-slate-800 text-sky-300 border-slate-700";
    let labelText = "LEFT";

    if (isOverdue) {
      cardBg = "bg-rose-950/90 border-rose-600/90 text-rose-100 hover:border-rose-400 shadow-sm";
      numberBg = "bg-rose-600 text-white border-rose-400 font-black animate-bounce";
      labelText = "OVERDUE";
    } else if (isToday) {
      cardBg = "bg-amber-950/90 border-amber-500/90 text-amber-100 hover:border-amber-400";
      numberBg = "bg-amber-500 text-slate-950 border-amber-300 font-black animate-pulse";
      labelText = "DUE TODAY";
    } else if (daysLeft <= 7) {
      cardBg = "bg-[#1E293B] border-sky-500/70 text-slate-100 hover:border-sky-400 shadow-sm";
      numberBg = "bg-sky-500 text-slate-950 border-sky-300 font-black";
      labelText = "SOON";
    }

    return (
      <div 
        key={item.id}
        onClick={() => setSelectedTask(item)}
        className={`flex items-center gap-2 px-2 py-0.5 rounded-md border text-[11px] transition-all cursor-pointer shrink-0 ${cardBg}`}
        title="Click to view full details & actions"
      >
        {/* Radio Button to Mark Complete & Rollover */}
        <button
          onClick={(e) => handleToggleComplete(e, item.id)}
          disabled={loadingTaskId === item.id}
          className="group relative focus:outline-none shrink-0"
          title="Mark complete & auto-rollover to next cycle"
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
        <div className={`flex items-center justify-center px-1.5 py-0.5 rounded font-mono text-[10.5px] font-black border leading-none shrink-0 gap-1 ${numberBg}`}>
          <span>{isOverdue ? Math.abs(daysLeft) : isToday ? "0" : daysLeft}d</span>
          <span className="text-[7px] uppercase font-bold tracking-tighter opacity-90">{labelText}</span>
        </div>

        {/* Title & Category */}
        <div className="flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[240px]">
          <span className="font-bold text-slate-100 truncate text-[10px] leading-tight">{item.title}</span>
          {item.category && (
            <span className="text-[8px] font-bold bg-slate-800 text-amber-300 px-1 py-0.25 rounded border border-slate-700 uppercase shrink-0">
              {item.category}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-slate-950 text-slate-100 border-b border-rose-950/80 sticky top-0 z-50 shadow-lg font-sans select-none text-xs">
        <div className="max-w-7xl mx-auto px-3 py-1.5 space-y-1">
          
          {/* HEADER BAR: Branding, Refresh, and Link to Expirations Agenda */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider text-[10px] shadow-sm animate-pulse">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>EXPIRATION & REMINDER ALERTS</span>
              </div>
              <button
                onClick={loadLatestTasks}
                disabled={isRefreshing}
                className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                title="Refresh Reminders"
              >
                <RefreshCw className={`w-3 h-3 text-sky-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Click any reminder for details
              </span>
              <Link
                href="/task-tracker?tab=expirations"
                className="flex items-center gap-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-2.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wider border border-rose-500/40 transition-colors"
              >
                <span>Agenda ({expirationTasks.length})</span>
                <ExternalLink className="w-3 h-3 text-sky-400" />
              </Link>
            </div>
          </div>

          {/* 3 STRUCTURED ROWS OF DUE AND NEXT REMINDERS */}
          <div className="space-y-1">
            
            {/* ROW 1: OVERDUE & DUE TODAY */}
            <div className="flex items-center gap-2">
              <div className="w-24 shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Due / Today:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
                {row1Items.length > 0 ? (
                  row1Items.map(renderBadgeItem)
                ) : (
                  <span className="text-[10px] text-emerald-400/80 italic flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    No urgent overdue reminders!
                  </span>
                )}
              </div>
            </div>

            {/* ROW 2: NEXT UPCOMING (1 - 30 DAYS) */}
            <div className="flex items-center gap-2">
              <div className="w-24 shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span>Next 30 Days:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
                {row2Items.length > 0 ? (
                  row2Items.map(renderBadgeItem)
                ) : (
                  <span className="text-[10px] text-slate-500 italic">No reminders scheduled in the next 30 days</span>
                )}
              </div>
            </div>

            {/* ROW 3: FUTURE CYCLES (> 30 DAYS) */}
            <div className="flex items-center gap-2">
              <div className="w-24 shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Next Cycles:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
                {row3Items.length > 0 ? (
                  row3Items.map(renderBadgeItem)
                ) : (
                  <span className="text-[10px] text-slate-500 italic">No future reminders beyond 30 days</span>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* INTERACTIVE DETAILS DROPDOWN / MODAL ON CLICK */}
      {selectedTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded">
                    {selectedTask.category || "Reminder"}
                  </span>
                  <span className="font-mono text-xs text-slate-400">#{selectedTask.id}</span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedTask.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Countdown and Schedule Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Expiration Date</span>
                </div>
                <div className="font-mono font-bold text-white text-sm">
                  {selectedTask.due_date || selectedTask.deadline || "No date"}
                </div>
                <div className="text-[10.5px] font-bold text-amber-300">
                  {(() => {
                    const days = getExactDaysRemaining(selectedTask.due_date || selectedTask.deadline);
                    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
                    if (days === 0) return "Due Today!";
                    return `${days} days remaining`;
                  })()}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recurrence</span>
                </div>
                <div className="font-bold text-emerald-300 text-sm">
                  {selectedTask.recurrence_period || "None"}
                </div>
                <div className="text-[10.5px] text-slate-400">
                  Lead: {selectedTask.reminder_days_before || 7} days before
                </div>
              </div>
            </div>

            {/* Assignee & Notes */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Responsible:</span>
                <span className="font-bold text-white">{selectedTask.assignee || "Unassigned"}</span>
              </div>

              {selectedTask.description && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Description & Notes</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">
                    {selectedTask.description}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={(e) => handleToggleComplete(e, selectedTask.id)}
                disabled={loadingTaskId === selectedTask.id}
                className="w-full sm:flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {loadingTaskId === selectedTask.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Complete & Auto-Rollover</span>
              </button>

              <Link
                href="/task-tracker?tab=expirations"
                onClick={() => setSelectedTask(null)}
                className="w-full sm:w-auto py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>Edit in Agenda</span>
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              </Link>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { getTasksAction, toggleTaskCompleteWithRolloverAction } from "@/actions/tasks";
import { 
  ShieldAlert, Calendar, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, 
  AlertTriangle, Bell, Sparkles, RefreshCw, FileText, ExternalLink, Flame
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialTasks?: Task[];
}

// Fallback seed tasks if no expiration tasks exist in storage
const getFallbackExpirations = (): Task[] => {
  const today = new Date();
  const past2Days = new Date(today.getTime() - 86400000 * 2).toISOString().split("T")[0];
  const in3Days = new Date(today.getTime() + 86400000 * 3).toISOString().split("T")[0];
  const in15Days = new Date(today.getTime() + 86400000 * 15).toISOString().split("T")[0];
  const in30Days = new Date(today.getTime() + 86400000 * 30).toISOString().split("T")[0];
  const in45Days = new Date(today.getTime() + 86400000 * 45).toISOString().split("T")[0];

  return [
    {
      id: 991,
      title: "Quarterly IATA Agent Maintenance Fee",
      description: "Mandatory quarterly dues payment to maintain IATA cargo agent status.",
      assignee: "Finance Dept",
      start_date: past2Days,
      deadline: past2Days,
      due_date: past2Days,
      status: "Pending",
      task_type: "expiration",
      category: "Payment",
      recurrence_period: "Quarterly",
      reminder_days_before: 7,
      subtasks: [],
      logs: [],
      created_at: today.toISOString()
    },
    {
      id: 992,
      title: "Miami Bonded Warehouse Storage Certification",
      description: "Annual customs bonded warehouse safety and security inspection.",
      assignee: "Ops Manager",
      start_date: today.toISOString().split("T")[0],
      deadline: in3Days,
      due_date: in3Days,
      status: "Pending",
      task_type: "expiration",
      category: "Certification",
      recurrence_period: "Annually",
      reminder_days_before: 7,
      subtasks: [],
      logs: [],
      created_at: today.toISOString()
    },
    {
      id: 993,
      title: "FMCSA Freight Forwarder License Renewal",
      description: "Annual renewal fee and compliance check for FMCSA operating authority.",
      assignee: "Compliance Dept",
      start_date: today.toISOString().split("T")[0],
      deadline: in15Days,
      due_date: in15Days,
      status: "Pending",
      task_type: "expiration",
      category: "Renewal",
      recurrence_period: "Annually",
      reminder_days_before: 15,
      subtasks: [],
      logs: [],
      created_at: today.toISOString()
    },
    {
      id: 994,
      title: "TSA Certified Cargo Screening Facility Permit",
      description: "Bi-annual TSA security audit and screening personnel certification.",
      assignee: "Security Director",
      start_date: today.toISOString().split("T")[0],
      deadline: in30Days,
      due_date: in30Days,
      status: "Pending",
      task_type: "expiration",
      category: "License",
      recurrence_period: "Bi-Annually",
      reminder_days_before: 30,
      subtasks: [],
      logs: [],
      created_at: today.toISOString()
    },
    {
      id: 995,
      title: "Annual Customs Brokerage Bond Renewal",
      description: "Continuous customs bond renewal filing.",
      assignee: "Customs Compliance",
      start_date: today.toISOString().split("T")[0],
      deadline: in45Days,
      due_date: in45Days,
      status: "Pending",
      task_type: "expiration",
      category: "Renewal",
      recurrence_period: "Annually",
      reminder_days_before: 30,
      subtasks: [],
      logs: [],
      created_at: today.toISOString()
    }
  ];
};

export function GlobalExpirationHeader({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);

  // Sync tasks on mount or polling
  useEffect(() => {
    getTasksAction().then(res => {
      if (res && res.length > 0) {
        setTasks(res);
      } else {
        setTasks(getFallbackExpirations());
      }
    }).catch(() => {
      setTasks(getFallbackExpirations());
    });
  }, []);

  const handleToggleComplete = async (taskId: number) => {
    setLoadingTaskId(taskId);
    try {
      if (taskId >= 990) {
        // Optimistic update for seed fallbacks
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            const currentDue = t.due_date || t.deadline || new Date().toISOString().split("T")[0];
            const d = new Date(currentDue);
            d.setMonth(d.getMonth() + 1);
            const nextDue = d.toISOString().split("T")[0];
            return { ...t, due_date: nextDue, deadline: nextDue, status: "Pending" };
          }
          return t;
        }));
      } else {
        const updated = await toggleTaskCompleteWithRolloverAction(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      }
    } catch (err) {
      console.error("Failed to complete expiration task:", err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter Expiration Tasks (or any task with task_type === 'expiration' or fallback)
  let activeExpirations = tasks.filter(t => (t.task_type === "expiration" || t.due_date) && t.status !== "Completed");
  if (activeExpirations.length === 0) {
    activeExpirations = getFallbackExpirations();
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  const getDaysDiff = (dueDateStr?: string | null) => {
    if (!dueDateStr) return 999;
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - todayDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Up to 2 Previous Overdue Items (due_date < today)
  const overdueItems = activeExpirations
    .filter(t => getDaysDiff(t.due_date || t.deadline) < 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline))
    .slice(0, 2);

  // 2. Next Immediate Expiration (due_date >= today, 1st item)
  const sortedUpcoming = activeExpirations
    .filter(t => getDaysDiff(t.due_date || t.deadline) >= 0)
    .sort((a, b) => getDaysDiff(a.due_date || a.deadline) - getDaysDiff(b.due_date || b.deadline));

  const immediateNext = sortedUpcoming.slice(0, 1);
  const next3After = sortedUpcoming.slice(1, 4);

  const allHeaderItems = [
    ...overdueItems.map(item => ({ ...item, isOverdueCategory: true })),
    ...immediateNext.map(item => ({ ...item, isImmediateNextCategory: true })),
    ...next3After.map(item => ({ ...item, isUpcomingCategory: true }))
  ];

  return (
    <div className="bg-slate-950 text-slate-100 border-b border-rose-950/80 sticky top-0 z-50 shadow-xl font-sans select-none">
      
      {/* DAILY EXPIRATION ALERT BAR */}
      <div className="max-w-7xl mx-auto px-3 py-2 flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* BRANDING BADGE */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[11px] shadow-sm shadow-rose-900/50 animate-pulse">
            <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>DAILY EXPIRATION ALERTS</span>
          </div>
        </div>

        {/* ITEMS CAROUSEL / GRID WITH BIG COUNTDOWN NUMBERS */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 max-w-full overflow-x-auto py-0.5">
          {allHeaderItems.map(item => {
            const daysLeft = getDaysDiff(item.due_date || item.deadline);
            const isOverdue = daysLeft < 0;
            const isToday = daysLeft === 0;

            let cardBg = "bg-slate-900 border-slate-700/80 text-slate-100";
            let numberBg = "bg-slate-800 text-sky-300 border-slate-700";
            let labelText = "DAYS LEFT";

            if (isOverdue) {
              cardBg = "bg-rose-950/80 border-rose-600/80 text-rose-100 shadow-md shadow-rose-950";
              numberBg = "bg-rose-600 text-white border-rose-400 animate-bounce";
              labelText = "DAYS OVERDUE";
            } else if (isToday) {
              cardBg = "bg-amber-950/80 border-amber-500/80 text-amber-100";
              numberBg = "bg-amber-500 text-slate-950 border-amber-300 animate-pulse font-black";
              labelText = "DUE TODAY";
            } else if ("isImmediateNextCategory" in item && item.isImmediateNextCategory) {
              cardBg = "bg-[#1E293B] border-sky-500/60 text-slate-100 shadow-sm";
              numberBg = "bg-sky-500 text-slate-950 border-sky-300 font-black";
              labelText = "NEXT EXPIRATION";
            }

            return (
              <div 
                key={item.id}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs transition-all shrink-0 ${cardBg}`}
              >
                {/* Radio Button to Mark Complete */}
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  disabled={loadingTaskId === item.id}
                  className="group relative focus:outline-none shrink-0"
                  title="Radio button: Mark completed & auto-rollover to next cycle"
                >
                  {loadingTaskId === item.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 group-hover:border-emerald-400 group-hover:bg-emerald-500/20 transition-all flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-emerald-400" />
                    </div>
                  )}
                </button>

                {/* BIG COUNTDOWN NUMBER BADGE */}
                <div className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border font-mono shrink-0 ${numberBg}`}>
                  <span className="text-base sm:text-lg font-black leading-none">
                    {isOverdue ? Math.abs(daysLeft) : isToday ? "0" : daysLeft}
                  </span>
                  <span className="text-[7.5px] font-black uppercase tracking-tighter leading-none pt-0.5">
                    {labelText}
                  </span>
                </div>

                {/* Title & Category */}
                <div className="flex flex-col truncate max-w-[170px] sm:max-w-[210px]">
                  <span className="font-extrabold text-slate-100 truncate text-[11px] leading-tight">{item.title}</span>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                    {item.category && (
                      <span className="text-amber-300 uppercase">{item.category}</span>
                    )}
                    <span>· Due: {item.due_date || item.deadline}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* LINK TO ALL TASKS */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/task-tracker?tab=expirations"
            className="flex items-center gap-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-500/50 transition-colors shadow-sm"
          >
            <span>View All Agenda ({activeExpirations.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
}

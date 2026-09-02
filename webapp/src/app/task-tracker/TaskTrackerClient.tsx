"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Task, Subtask, TaskCategory, RecurrencePeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Search, Plus, List, Kanban, ArrowUpDown, Layers, Clipboard, 
  Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2, User, 
  Calendar, Check, Copy, AlertTriangle, ExternalLink, CheckSquare, Edit,
  ShieldAlert, RefreshCw, Sparkles, FileText, Circle, Repeat
} from "lucide-react";
import { 
  createTaskAction, updateTaskAction, deleteTaskAction, toggleSubtaskAction,
  createExpirationTaskAction, toggleTaskCompleteWithRolloverAction
} from "@/actions/tasks";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface TaskTrackerClientProps {
  initialTasks: Task[];
}

export function TaskTrackerClient({ initialTasks }: TaskTrackerClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskTab, setTaskTab] = useState<"workflow" | "expirations">("workflow");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [sortBy, setSortBy] = useState<"created_at" | "deadline">("deadline");
  const [groupBy, setGroupBy] = useState<"status" | "assignee">("status");
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  // Expiration Dialog States
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expAssignee, setExpAssignee] = useState("");
  const [expDueDate, setExpDueDate] = useState("");
  const [expCategory, setExpCategory] = useState<TaskCategory>("Renewal");
  const [expRecurrence, setExpRecurrence] = useState<RecurrencePeriod>("Annually");
  const [expReminderDays, setExpReminderDays] = useState(7);


  // Linkage states
  const [taskShipmentId, setTaskShipmentId] = useState("");
  const [taskShipmentRef, setTaskShipmentRef] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const sId = searchParams.get("shipment_id");
    const sRef = searchParams.get("reference");
    if (sId) {
      setTaskShipmentId(sId);
      if (sRef) setTaskShipmentRef(sRef);
      setDialogOpen(true);
    }
  }, [searchParams]);

  // New Task Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [subtasksList, setSubtasksList] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  // Task Log States
  const [newLogAuthor, setNewLogAuthor] = useState("");
  const [newLogMessage, setNewLogMessage] = useState("");

  // Edit Task Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editSubtasks, setEditSubtasks] = useState<Subtask[]>([]);
  const [newEditSubtaskTitle, setNewEditSubtaskTitle] = useState("");
  const [editLogAuthor, setEditLogAuthor] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [copySuccessId, setCopySuccessId] = useState<number | null>(null);

  // Sync state with server changes
  const refreshTasks = async () => {
    // Rely on router refresh or refetch. Since we're in Client Component, we can fetch
    // or just update state locally for instant performance.
  };

  const handleAddSubtaskField = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasksList(prev => [...prev, newSubtaskTitle.trim()]);
      setNewSubtaskTitle("");
    }
  };

  const handleRemoveSubtaskField = (idx: number) => {
    setSubtasksList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const subs: Subtask[] = subtasksList.map((t, idx) => ({
        id: `newsub-${Date.now()}-${idx}`,
        title: t,
        completed: false
      }));

      const newTask = await createTaskAction(
        title.trim(),
        description.trim() || null,
        assignee.trim() || null,
        startDate || null,
        deadline || null,
        subs,
        taskShipmentId ? parseInt(taskShipmentId) : null,
        taskShipmentRef.trim() || null
      );

      setTasks(prev => [newTask, ...prev]);
      setDialogOpen(false);
      resetForm();
    });
  };

  const handleCreateExpirationTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expDueDate) return;

    startTransition(async () => {
      const newExp = await createExpirationTaskAction(
        expTitle.trim(),
        expDescription.trim() || null,
        expAssignee.trim() || null,
        expDueDate,
        expCategory,
        expRecurrence,
        Number(expReminderDays)
      );
      setTasks(prev => [newExp, ...prev]);
      setExpDialogOpen(false);
      setExpTitle("");
      setExpDescription("");
      setExpAssignee("");
      setExpDueDate("");
    });
  };

  const handleToggleRolloverTask = (id: number) => {
    startTransition(async () => {
      const updated = await toggleTaskCompleteWithRolloverAction(id);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignee("");
    setStartDate("");
    setDeadline("");
    setSubtasksList([]);
    setNewSubtaskTitle("");
    setTaskShipmentId("");
    setTaskShipmentRef("");
  };

  const handleToggleSubtask = async (taskId: number, subtaskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const sub = task.subtasks.find(s => s.id === subtaskId);
    const subTitle = sub ? sub.title : "Unknown Subtask";

    const newLog = {
      timestamp: new Date().toISOString(),
      author: "System",
      message: `Subtask '${subTitle}' marked as ${nextCompleted ? "completed" : "incomplete"}`
    };
    const updatedLogs = [...(task.logs || []), newLog];
    const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: nextCompleted } : s);
    
    // Optimistic Update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: updatedSubtasks,
          logs: updatedLogs
        };
      }
      return t;
    }));

    await updateTaskAction(taskId, { subtasks: updatedSubtasks, logs: updatedLogs });
  };

  const handleUpdateStatus = async (taskId: number, nextStatus: 'Pending' | 'In Progress' | 'Completed') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    if (oldStatus === nextStatus) return;

    const newLog = {
      timestamp: new Date().toISOString(),
      author: "System",
      message: `Status changed from '${oldStatus}' to '${nextStatus}'`
    };
    const updatedLogs = [...(task.logs || []), newLog];

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus, logs: updatedLogs } : t));
    await updateTaskAction(taskId, { status: nextStatus, logs: updatedLogs });
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    setTasks(prev => prev.filter(t => t.id !== id));
    if (expandedTaskId === id) setExpandedTaskId(null);
    await deleteTaskAction(id);
  };

  const handleCopyTaskReminder = (task: Task) => {
    const subtasksText = task.subtasks.length > 0 
      ? "\nSubtasks list:\n" + task.subtasks.map(s => `${s.completed ? "[x]" : "[ ]"} ${s.title}`).join("\n")
      : "";

    const text = `📢 *TASK REMINDER* (File ID: ${task.id})
📌 *Title*: ${task.title}
👤 *Assignee*: ${task.assignee || "Unassigned"}
📅 *Deadline*: ${task.deadline || "TBD"}
📝 *Details*: ${task.description || "No description provided."}${subtasksText}
      
Please review and update this task as soon as possible!`;

    navigator.clipboard.writeText(text);
    setCopySuccessId(task.id);
    setTimeout(() => setCopySuccessId(null), 2500);
  };

  const handleAddTaskLog = async (taskId: number) => {
    if (!newLogMessage.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const authorName = newLogAuthor.trim() || task.assignee || "Staff";
    const newLog = {
      timestamp: new Date().toISOString(),
      author: authorName,
      message: newLogMessage.trim()
    };

    const updatedLogs = [...(task.logs || []), newLog];

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, logs: updatedLogs } : t));
    setNewLogMessage("");

    await updateTaskAction(taskId, { logs: updatedLogs });
  };

  const handleOpenEditDialog = (task: Task) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditAssignee(task.assignee || "");
    setEditStartDate(task.start_date || "");
    setEditDeadline(task.deadline || "");
    setEditSubtasks(task.subtasks || []);
    setNewEditSubtaskTitle("");
    setEditLogAuthor("");
    setEditDialogOpen(true);
  };

  const handleAddEditSubtaskField = () => {
    if (newEditSubtaskTitle.trim()) {
      const newSub: Subtask = {
        id: `edit-sub-${Date.now()}`,
        title: newEditSubtaskTitle.trim(),
        completed: false
      };
      setEditSubtasks(prev => [...prev, newSub]);
      setNewEditSubtaskTitle("");
    }
  };

  const handleRemoveEditSubtaskField = (id: string) => {
    setEditSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveTaskEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskId) return;
    const task = tasks.find(t => t.id === editTaskId);
    if (!task) return;

    const author = editLogAuthor.trim() || task.assignee || "Staff";
    const changesLogs: string[] = [];

    if (editTitle.trim() !== task.title) {
      changesLogs.push(`Title changed from '${task.title}' to '${editTitle.trim()}'`);
    }
    if (editDescription.trim() !== (task.description || "")) {
      changesLogs.push(`Description updated`);
    }
    if (editAssignee.trim() !== (task.assignee || "")) {
      changesLogs.push(`Assignee changed from '${task.assignee || "None"}' to '${editAssignee.trim() || "None"}'`);
    }
    if (editStartDate !== (task.start_date || "")) {
      changesLogs.push(`Start date changed from '${task.start_date || "None"}' to '${editStartDate || "None"}'`);
    }
    if (editDeadline !== (task.deadline || "")) {
      changesLogs.push(`Deadline changed from '${task.deadline || "None"}' to '${editDeadline || "None"}'`);
    }

    // Check subtasks changes
    const oldSubtaskIds = new Set(task.subtasks.map(s => s.id));
    editSubtasks.forEach(s => {
      if (!oldSubtaskIds.has(s.id)) {
        changesLogs.push(`Subtask '${s.title}' added`);
      }
    });
    const newSubtaskIds = new Set(editSubtasks.map(s => s.id));
    task.subtasks.forEach(s => {
      if (!newSubtaskIds.has(s.id)) {
        changesLogs.push(`Subtask '${s.title}' removed`);
      }
    });

    const newLogs = [...(task.logs || [])];
    changesLogs.forEach(msg => {
      newLogs.push({
        timestamp: new Date().toISOString(),
        author: author,
        message: msg
      });
    });

    const updatedFields = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      assignee: editAssignee.trim() || null,
      start_date: editStartDate || null,
      deadline: editDeadline || null,
      subtasks: editSubtasks,
      logs: newLogs
    };

    setTasks(prev => prev.map(t => t.id === editTaskId ? { ...t, ...updatedFields } : t));
    setEditDialogOpen(false);

    await updateTaskAction(editTaskId, updatedFields);
  };

  const getDeadlineColor = (task: Task) => {
    if (task.status === "Completed") return "text-emerald-400 border-emerald-950 bg-emerald-950/10";
    if (!task.deadline) return "text-slate-500 border-slate-900 bg-slate-900/20";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.deadline);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-rose-500 border-rose-950 bg-rose-950/20 animate-pulse font-extrabold";
    if (diffDays === 0) return "text-rose-400 border-rose-950 bg-rose-950/15 font-bold";
    if (diffDays <= 3) return "text-amber-500 border-amber-950 bg-amber-950/15 font-bold";
    return "text-emerald-400 border-emerald-950 bg-emerald-950/10";
  };

  const getDeadlineText = (task: Task) => {
    if (task.status === "Completed") return "Completed";
    if (!task.deadline) return "No Deadline";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.deadline);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    return `Due in ${diffDays} days`;
  };

  // Filter & Sort Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q)) ||
        t.id.toString().includes(search)
      );
    }).sort((a, b) => {
      if (sortBy === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      // default creation order desc (newest first)
      return b.id - a.id;
    });
  }, [tasks, search, sortBy]);

  // Grouped Tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    if (groupBy === "status") {
      groups["Pending"] = [];
      groups["In Progress"] = [];
      groups["Completed"] = [];

      filteredTasks.forEach(t => {
        if (groups[t.status]) {
          groups[t.status].push(t);
        } else {
          groups[t.status] = [t];
        }
      });
    } else {
      // Group by assignee
      filteredTasks.forEach(t => {
        const key = t.assignee || "Unassigned";
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(t);
      });
    }

    return groups;
  }, [filteredTasks, groupBy]);

  return (
    <div className="space-y-6">

      {/* TOP NAVIGATION TABS: WORKFLOW VS EXPIRATIONS AGENDA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border p-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
          <button
            onClick={() => setTaskTab("workflow")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
              taskTab === "workflow"
                ? "bg-[#A89ACC] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Workflow Tasks Board</span>
            <span className="bg-white/20 px-1.5 py-0.25 rounded text-[10px]">
              {tasks.filter(t => t.task_type !== "expiration").length}
            </span>
          </button>

          <button
            onClick={() => setTaskTab("expirations")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
              taskTab === "expirations"
                ? "bg-[#5A4F7A] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            <span>Certifications & Expirations</span>
            <span className="bg-rose-500/30 text-rose-200 px-1.5 py-0.25 rounded text-[10px] font-mono">
              {tasks.filter(t => t.task_type === "expiration" && t.status !== "Completed").length} Active
            </span>
          </button>
        </div>

        {/* Action button based on active tab */}
        {taskTab === "expirations" && (
          <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
            <DialogTrigger className="bg-[#5A4F7A] hover:bg-[#473E63] text-white text-xs font-bold gap-1.5 shadow-sm px-3 py-2 rounded-lg inline-flex items-center">
              <Plus className="w-4 h-4 text-emerald-300" />
              Add Expiration / Renewal
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  New Certification, Renewal or Payment
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Schedule recurring expirations, licenses, and payments with automatic rollover logic.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateExpirationTask} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Title / Description *</Label>
                  <Input
                    required
                    value={expTitle}
                    onChange={e => setExpTitle(e.target.value)}
                    placeholder="e.g. FMCSA Freight Forwarder License Renewal"
                    className="text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Category</Label>
                    <select
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value as any)}
                      className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-semibold"
                    >
                      <option value="Certification">Certification</option>
                      <option value="Renewal">Renewal</option>
                      <option value="Payment">Payment</option>
                      <option value="License">License</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Recurrence Period</Label>
                    <select
                      value={expRecurrence}
                      onChange={e => setExpRecurrence(e.target.value as any)}
                      className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-semibold"
                    >
                      <option value="None">None (One-time)</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Bi-Annually">Bi-Annually (6 Mo)</option>
                      <option value="Annually">Annually (1 Year)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Expiration Due Date *</Label>
                    <Input
                      required
                      type="date"
                      value={expDueDate}
                      onChange={e => setExpDueDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Reminder Lead (Days)</Label>
                    <select
                      value={expReminderDays}
                      onChange={e => setExpReminderDays(Number(e.target.value))}
                      className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-semibold"
                    >
                      <option value={3}>3 Days Before</option>
                      <option value={7}>7 Days Before</option>
                      <option value={15}>15 Days Before</option>
                      <option value={30}>30 Days Before</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assignee / Department</Label>
                  <Input
                    value={expAssignee}
                    onChange={e => setExpAssignee(e.target.value)}
                    placeholder="e.g. Compliance Dept / Finance"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Additional Details</Label>
                  <Input
                    value={expDescription}
                    onChange={e => setExpDescription(e.target.value)}
                    placeholder="e.g. Mandatory audit and state filing fees"
                    className="text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setExpDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#5A4F7A] hover:bg-[#473E63] text-white font-bold">
                    Save Expiration Reminder
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* EXPIRATIONS TAB AGENDA VIEW */}
      {taskTab === "expirations" ? (
        <div className="space-y-6">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Certifications, Renewals & Payments Agenda
                </h2>
                <p className="text-xs text-muted-foreground">
                  Track permits, license renewals, and recurring payments. Marking an item completed automatically advances its due date to the next period.
                </p>
              </div>
            </div>

            {/* EXPIRATIONS LIST CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.filter(t => t.task_type === "expiration").map(item => {
                const todayStr = new Date().toISOString().split("T")[0];
                const dueStr = item.due_date || item.deadline || todayStr;
                const diffDays = Math.ceil((new Date(dueStr).getTime() - new Date(todayStr).getTime()) / (86400000));
                const isCompleted = item.status === "Completed";
                const isOverdue = !isCompleted && diffDays < 0;
                const isToday = !isCompleted && diffDays === 0;

                let cardBorder = "border-border";
                let badgeBg = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300";
                let statusText = `In ${diffDays} days`;

                if (isCompleted) {
                  badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                  statusText = "Completed / Rolled Over";
                } else if (isOverdue) {
                  cardBorder = "border-rose-500/50 bg-rose-50/20 dark:bg-rose-950/20";
                  badgeBg = "bg-rose-600 text-white font-black animate-pulse";
                  statusText = `Overdue by ${Math.abs(diffDays)}d`;
                } else if (isToday) {
                  cardBorder = "border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/20";
                  badgeBg = "bg-amber-500 text-slate-950 font-black";
                  statusText = "Due Today!";
                }

                return (
                  <div key={item.id} className={`bg-card border ${cardBorder} p-4 rounded-xl shadow-sm space-y-3 flex flex-col justify-between`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>
                          {statusText}
                        </span>
                        {item.category && (
                          <span className="text-[9px] font-bold bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground uppercase">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-foreground leading-snug">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border space-y-2 text-[11px] text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Due Date:</span>
                        <span className="font-bold text-foreground font-mono">{dueStr}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Recurrence:</span>
                        <span className="font-bold text-[#5A4F7A] bg-[#F2F0F8] dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                          <Repeat className="w-3 h-3 inline mr-1" />
                          {item.recurrence_period || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Assignee:</span>
                        <span className="font-bold text-foreground">{item.assignee || "Unassigned"}</span>
                      </div>

                      <div className="pt-2 flex justify-between items-center">
                        <button
                          onClick={() => handleToggleRolloverTask(item.id)}
                          className="w-full py-2 px-3 bg-[#5A4F7A] hover:bg-[#473E63] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <Circle className="w-4 h-4 text-emerald-300" />
                          <span>Complete & Auto-Rollover Cycle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (

      /* REGULAR KANBAN / WORKFLOW BOARD VIEW */
      <>
      {/* CONTROLS HEADER ROW */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card border border-border p-3.5 rounded-xl">
        
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, description, assignee..."
            className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#A89ACC]/60 focus-visible:border-[#A89ACC] rounded-xl text-xs font-semibold"
          />
        </div>

        {/* Filters/Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground h-8 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-foreground"
            >
              <option value="deadline">Sort: Deadline</option>
              <option value="created_at">Sort: Creation Date</option>
            </select>
          </div>

          {/* Grouping */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground h-8 shrink-0">
            <Layers className="w-3.5 h-3.5" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-foreground"
            >
              <option value="status">Group: Status</option>
              <option value="assignee">Group: Assignee</option>
            </select>
          </div>

          {/* Layout Toggle (List / Kanban) */}
          <div className="flex bg-muted p-0.5 rounded-lg border border-border gap-0.5 h-8 shrink-0">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-[10px] font-bold rounded flex items-center gap-1.5 transition-all ${
                viewMode === "kanban" ? "bg-[#A89ACC] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-[10px] font-bold rounded flex items-center gap-1.5 transition-all ${
                viewMode === "list" ? "bg-[#A89ACC] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Add Task dialog */}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if(!v) resetForm(); }}>
            <DialogTrigger render={<Button className="h-10 bg-[#A89ACC] hover:bg-[#9080BA] text-white font-bold shadow-sm rounded-xl px-4 text-xs gap-1.5" />}>
              <Plus className="w-4 h-4" />
              New Task
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl w-full bg-card border-border text-foreground rounded-2xl shadow-2xl p-6">
              <DialogHeader className="border-b border-border pb-4">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <CheckSquare className="w-5 h-5 text-[#A89ACC]" />
                  Create Task Workflow
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Create a tracking task, delegate it to an operator, set a timeline schedule, and draft initial subtasks.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateTask} className="space-y-4 pt-4 text-xs font-semibold text-muted-foreground">
                <div className="grid gap-1.5">
                  <Label htmlFor="task_title" className="text-foreground uppercase text-[10px] tracking-wider">Task Title*</Label>
                  <Input 
                    id="task_title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Confirm ocean booking with Maersk"
                    className="bg-background border-border text-foreground h-10"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="task_desc" className="text-foreground uppercase text-[10px] tracking-wider">Description / Instructions</Label>
                  <textarea 
                    id="task_desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter details, file numbers, custom codes, carrier emails..."
                    className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A89ACC] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_assignee" className="text-foreground uppercase text-[10px] tracking-wider">Assignee / Staff</Label>
                    <Input 
                      id="task_assignee"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="bg-background border-border text-foreground h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_start" className="text-foreground uppercase text-[10px] tracking-wider">Start Date</Label>
                    <Input 
                      id="task_start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background border-border text-foreground h-10 font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_due" className="text-foreground uppercase text-[10px] tracking-wider">Deadline Date</Label>
                    <Input 
                      id="task_due"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="bg-background border-border text-foreground h-10 font-mono"
                    />
                  </div>
                </div>

                {/* Subtask Draft List */}
                <div className="border-t border-border pt-4 space-y-3">
                  <Label className="text-foreground uppercase text-[10px] tracking-wider block">Add Initial Subtasks Checklist</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="e.g. Submit customs clearance filing..."
                      className="bg-background border-border text-foreground h-9"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddSubtaskField}
                      className="bg-[#A89ACC] hover:bg-[#9080BA] text-white font-bold h-9"
                    >
                      Add
                    </Button>
                  </div>

                  {subtasksList.length > 0 && (
                    <div className="bg-muted p-2.5 rounded-lg border border-border max-h-28 overflow-y-auto space-y-1 font-mono text-[10px] text-muted-foreground">
                      {subtasksList.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center py-0.5 border-b border-border/30 last:border-b-0">
                          <span>• {t}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSubtaskField(idx)}
                            className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link Shipment (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-900 pt-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_shipment_id" className="text-slate-600 dark:text-slate-250 uppercase text-[10px] tracking-wider">Link Shipment File ID (Optional)</Label>
                    <Input 
                      id="task_shipment_id"
                      type="number"
                      value={taskShipmentId}
                      onChange={(e) => setTaskShipmentId(e.target.value)}
                      placeholder="e.g. 1001"
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 h-10 font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_shipment_ref" className="text-slate-600 dark:text-slate-250 uppercase text-[10px] tracking-wider">Link Shipment Reference</Label>
                    <Input 
                      id="task_shipment_ref"
                      value={taskShipmentRef}
                      onChange={(e) => setTaskShipmentRef(e.target.value)}
                      placeholder="e.g. REF-2026"
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 h-10 font-mono"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setDialogOpen(false); resetForm(); }}
                    className="bg-transparent border-border text-muted-foreground hover:text-foreground rounded-xl h-10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="bg-[#A89ACC] hover:bg-[#9080BA] text-white font-bold rounded-xl h-10 px-6"
                  >
                    {isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
 
          {/* Edit Task dialog */}
          <Dialog open={editDialogOpen} onOpenChange={(v) => { setEditDialogOpen(v); }}>
            <DialogContent className="sm:max-w-2xl w-full bg-card border-border text-foreground rounded-2xl shadow-2xl p-6">
              <DialogHeader className="border-b border-border pb-4">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Edit className="w-5 h-5 text-[#D4A843]" />
                  Edit Task Details
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Update task info and timelines. Modifying any field will automatically log the change in the history log.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveTaskEdits} className="space-y-4 pt-4 text-xs font-semibold text-slate-300">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_task_title" className="text-slate-200 uppercase text-[10px] tracking-wider">Task Title*</Label>
                  <Input 
                    id="edit_task_title"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter task objective..."
                    className="bg-slate-900 border-slate-800 text-slate-200 h-10"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit_task_desc" className="text-slate-200 uppercase text-[10px] tracking-wider">Task Details / Description</Label>
                  <textarea
                    id="edit_task_desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter comprehensive scope of work..."
                    className="flex w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 placeholder:text-slate-550 focus-visible:outline-none min-h-[90px] text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit_task_assignee" className="text-slate-200 uppercase text-[10px] tracking-wider">Assignee / Owner</Label>
                    <Input 
                      id="edit_task_assignee"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      placeholder="e.g. Gaston B."
                      className="bg-slate-900 border-slate-800 text-slate-200 h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit_task_start" className="text-slate-200 uppercase text-[10px] tracking-wider">Start Date</Label>
                    <Input 
                      id="edit_task_start"
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit_task_due" className="text-slate-200 uppercase text-[10px] tracking-wider">Deadline Date</Label>
                    <Input 
                      id="edit_task_due"
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                    />
                  </div>
                </div>

                {/* Subtask checklist manager */}
                <div className="border-t border-slate-900 pt-4 space-y-3">
                  <Label className="text-slate-200 uppercase text-[10px] tracking-wider block">Manage Subtasks Checklist</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEditSubtaskTitle}
                      onChange={(e) => setNewEditSubtaskTitle(e.target.value)}
                      placeholder="Add subtask checklist item..."
                      className="bg-slate-900 border-slate-800 text-slate-200 h-9"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddEditSubtaskField}
                      className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold h-9"
                    >
                      Add
                    </Button>
                  </div>

                  {editSubtasks.length > 0 && (
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 max-h-36 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-400">
                      {editSubtasks.map((st) => (
                        <div key={st.id} className="flex justify-between items-center py-0.5 border-b border-slate-950/20 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => {
                                setEditSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s));
                              }}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className={st.completed ? "line-through text-slate-600" : ""}>{st.title}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveEditSubtaskField(st.id)}
                            className="text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 p-1 rounded text-[9px]"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Operator name to attribute logs */}
                <div className="border-t border-slate-900 pt-4 grid gap-1.5">
                  <Label htmlFor="edit_log_author" className="text-slate-200 uppercase text-[10px] tracking-wider">Your Name / Operator Name (For Logs)</Label>
                  <Input 
                    id="edit_log_author"
                    value={editLogAuthor}
                    onChange={(e) => setEditLogAuthor(e.target.value)}
                    placeholder="Defaults to Staff..."
                    className="bg-slate-900 border-slate-800 text-slate-200 h-9"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setEditDialogOpen(false); }}
                    className="bg-transparent border-border text-muted-foreground hover:text-foreground rounded-xl h-10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#D4A843] hover:bg-[#BF9035] text-white font-bold rounded-xl h-10 px-6"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* RENDER TASKS WORKSPACE */}
      {viewMode === "list" ? (
        /* ==================== LIST VIEW LAYOUT ==================== */
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-mono uppercase tracking-widest border-b border-border">
              <tr>
                <th className="p-3 w-16 text-center">ID</th>
                <th className="p-3">Task Title</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Timeline</th>
                <th className="p-3">Deadline Proximity</th>
                <th className="p-3 text-right">Status</th>
                <th className="p-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center italic text-slate-550">No tasks found matching query.</td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  const isExpanded = expandedTaskId === t.id;
                  const dColor = getDeadlineColor(t);
                  return (
                    <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-accent transition-all">
                      <td colSpan={7} className="p-0">
                        <div 
                          onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                          className="flex w-full items-center p-3 cursor-pointer hover:text-white transition-all text-slate-350"
                        >
                          <span className="w-16 text-center font-mono text-[10px] text-slate-600 font-bold shrink-0">#{t.id}</span>
                          
                          <div className="flex-grow font-bold text-slate-200 pl-2 pr-4 min-w-0 flex flex-col justify-center">
                            <span className="truncate">{t.title}</span>
                            {t.shipment_id && (
                              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                <Link 
                                  href={`/shipment/${t.shipment_id}`}
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-500 dark:text-indigo-450 hover:text-indigo-650 dark:hover:text-indigo-350 font-bold font-mono transition-colors"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  File #{t.shipment_id} {t.shipment_reference ? `(${t.shipment_reference})` : ""}
                                </Link>
                              </div>
                            )}
                          </div>

                          <div className="w-32 truncate px-3 shrink-0 flex items-center gap-1.5 text-slate-400 font-medium">
                            <User className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                            {t.assignee || "Unassigned"}
                          </div>

                          <div className="w-32 font-mono text-[10px] text-slate-500 px-3 shrink-0">
                            {t.start_date || "-"} • {t.deadline || "-"}
                          </div>

                          <div className="w-40 px-3 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase font-mono ${dColor}`}>
                              {getDeadlineText(t)}
                            </span>
                          </div>

                          <div className="w-28 text-right px-3 shrink-0">
                            <select
                              value={t.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateStatus(t.id, e.target.value as any)}
                              className="bg-card text-foreground border border-border rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer outline-none focus:ring-0"
                            >
                              <option value="Pending" className="text-slate-400 bg-slate-950">Pending</option>
                              <option value="In Progress" className="text-indigo-400 bg-slate-950">In Progress</option>
                              <option value="Completed" className="text-emerald-400 bg-slate-950">Completed</option>
                            </select>
                          </div>

                          <div className="w-32 flex items-center justify-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                             <button
                              onClick={() => handleOpenEditDialog(t)}
                              className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-[#D4A843]/50 transition-all"
                              title="Edit Task"
                            >
                              <Edit className="w-3.5 h-3.5 text-[#D4A843]" />
                            </button>
                            <button
                              onClick={() => handleCopyTaskReminder(t)}
                              className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-[#7BB5A0]/50 transition-all relative"
                              title="Copy Whatsapp Reminder"
                            >
                              {copySuccessId === t.id ? <Check className="w-3.5 h-3.5 text-[#7BB5A0]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-400 hover:text-rose-500 hover:border-rose-300 transition-all"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Detail Panel */}
                        {isExpanded && (
                          <div className="bg-[#FDFAF7] border-t border-border p-4 pl-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-muted-foreground animate-in slide-in-from-top-2 duration-155">
                            
                            {/* Left description */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold text-[#5A4F7A] uppercase tracking-wider">Instructions / Description</h4>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {t.description || <span className="italic text-slate-600">No description provided for this task. Click Edit to add details.</span>}
                              </p>
                              
                              <div className="flex gap-4 pt-3 font-mono text-[10px] text-slate-500">
                                <div>Created At: {format(new Date(t.created_at), 'yyyy-MM-dd HH:mm')}</div>
                                <div>Status: <span className="font-bold text-slate-350">{t.status}</span></div>
                              </div>
                            </div>

                            {/* Subtask list */}
                            <div className="space-y-3 bg-[#FDF8F5] border border-[#F0C5BC] rounded-xl p-3.5">
                              <h4 className="text-[10px] font-semibold text-[#5A4F7A] uppercase tracking-wider">
                                Checklist Sub-tasks ({t.subtasks.filter(s => s.completed).length}/{t.subtasks.length})
                              </h4>
                              
                              {t.subtasks.length === 0 ? (
                                <p className="italic text-slate-600 py-2">No subtasks created.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {t.subtasks.map(sub => (
                                    <label 
                                      key={sub.id} 
                                      className="flex items-center gap-2.5 p-1 rounded hover:bg-slate-900/30 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={sub.completed}
                                        onChange={() => handleToggleSubtask(t.id, sub.id, sub.completed)}
                                        className="rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4 shrink-0"
                                      />
                                      <span className={`font-mono text-[11px] truncate ${sub.completed ? "line-through text-slate-600 font-semibold" : "text-slate-300 font-bold"}`}>
                                        {sub.title}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Task History Logs */}
                            <div className="space-y-3 bg-[#F2F0F8] border border-[#C8C0E0] rounded-xl p-3.5">
                              <h4 className="text-[10px] font-semibold text-[#5A4F7A] uppercase tracking-wider">
                                Task Evolution History ({t.logs?.length || 0})
                              </h4>
                              
                              {/* Logs Feed List */}
                              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                {!t.logs || t.logs.length === 0 ? (
                                  <p className="italic text-slate-500 text-[10px] py-1">No updates logged yet.</p>
                                ) : (
                                  [...t.logs].reverse().map((log, idx) => (
                                    <div key={idx} className="p-2 bg-white/60 border border-[#C8C0E0]/30 rounded-lg space-y-1">
                                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                                        <span className="font-bold text-[#5A4F7A]">👤 {log.author}</span>
                                        <span>{new Date(log.timestamp).toLocaleString('en-US', {
                                          timeZone: 'America/New_York',
                                          month: 'short',
                                          day: '2-digit',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        }).replace(',', '')}</span>
                                      </div>
                                      <p className="text-[10.5px] text-slate-700 leading-snug font-semibold">{log.message}</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Add Log Form */}
                              <div className="space-y-2 pt-2 border-t border-[#C8C0E0]/60">
                                <div className="flex gap-2">
                                  <Input
                                    value={newLogAuthor}
                                    onChange={(e) => setNewLogAuthor(e.target.value)}
                                    placeholder="Name"
                                    className="bg-white border-[#C8C0E0] text-slate-700 h-7 text-[10px] font-bold w-1/3 shrink-0"
                                  />
                                  <Input
                                    value={newLogMessage}
                                    onChange={(e) => setNewLogMessage(e.target.value)}
                                    placeholder="Add progress log..."
                                    className="bg-white border-[#C8C0E0] text-slate-700 h-7 text-[10px] font-medium flex-grow"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTaskLog(t.id);
                                      }
                                    }}
                                  />
                                  <Button 
                                    type="button" 
                                    onClick={() => handleAddTaskLog(t.id)}
                                    className="bg-[#A89ACC] hover:bg-[#9080BA] text-white font-bold h-7 text-[10px] px-2.5 shrink-0"
                                  >
                                    Log
                                  </Button>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ==================== KANBAN BOARD VIEW LAYOUT ==================== */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(groupedTasks).map(([groupName, groupList]) => {
            return (
              <div key={groupName} className="space-y-4 flex flex-col h-full min-h-[500px]">
                
                {/* Column header */}
                <div className="flex justify-between items-center bg-card border border-border px-4 py-2.5 rounded-xl shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#A89ACC]"></span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {groupBy === "status" ? `${groupName} Column` : `Assignee: ${groupName}`}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F2F0F8] text-[#5A4F7A] border border-[#C8C0E0] rounded">
                    {groupList.length} Tasks
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-grow bg-muted/50 border border-dashed border-border rounded-2xl p-3 space-y-3 overflow-y-auto min-h-[400px]">
                  {groupList.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-12 text-muted-foreground italic text-xs">No tasks in this column</div>
                  ) : (
                    groupList.map(t => {
                      const isExpanded = expandedTaskId === t.id;
                      const dColor = getDeadlineColor(t);
                      return (
                        <div 
                          key={t.id} 
                          className={`bg-white border rounded-xl overflow-hidden hover:border-[#C8C0E0] transition-all duration-200 shadow-sm flex flex-col relative ${
                            isExpanded ? "border-[#A89ACC]/50" : "border-slate-200"
                          }`}
                        >
                          {/* Colored status border on top of card */}
                          <div className={`h-1 w-full ${
                            t.status === 'Completed' ? 'bg-[#7BB5A0]' : t.status === 'In Progress' ? 'bg-[#A89ACC]' : 'bg-slate-200'
                          }`} />

                          <div className="p-4 flex flex-col space-y-3">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-mono text-[9px] text-slate-400 font-extrabold">#{t.id}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditDialog(t)}
                                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded"
                                  title="Edit Task"
                                >
                                  <Edit className="w-3 h-3 text-[#D4A843]" />
                                </button>
                                <button
                                  onClick={() => handleCopyTaskReminder(t)}
                                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded"
                                  title="Copy Reminder"
                                >
                                  {copySuccessId === t.id ? <Check className="w-3 h-3 text-[#7BB5A0]" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Card title */}
                            <h4 
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="font-bold text-foreground text-xs hover:text-[#A89ACC] cursor-pointer transition-colors leading-tight font-sans"
                            >
                              {t.title}
                            </h4>

                            {t.shipment_id && (
                              <div className="pt-0.5">
                                <Link 
                                  href={`/shipment/${t.shipment_id}`}
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-indigo-500" />
                                  File #{t.shipment_id} {t.shipment_reference ? `(${t.shipment_reference})` : ""}
                                </Link>
                              </div>
                            )}

                            {/* Proximity badge & Assignee */}
                            <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold truncate max-w-[120px]">
                                <User className="w-3 h-3 text-indigo-400/80 shrink-0" />
                                {t.assignee || "Unassigned"}
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono border ${dColor}`}>
                                {getDeadlineText(t)}
                              </span>
                            </div>

                            {/* Expand toggle */}
                            <button
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="w-full flex items-center justify-center py-1 border-t border-border mt-2 text-[9px] font-bold text-muted-foreground hover:text-foreground gap-1 transition-colors"
                            >
                              {isExpanded ? (
                                <>Collapse Details <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Expand Details <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          </div>

                          {/* Expanded inline panel */}
                          {isExpanded && (
                            <div className="bg-[#050507] border-t border-slate-900 p-4 space-y-4 text-xs text-slate-450 animate-in fade-in duration-200">
                              
                              <div className="space-y-1">
                                <h5 className="text-[9px] font-mono font-black uppercase text-indigo-400 tracking-wider">Instructions</h5>
                                <p className="text-slate-350 leading-relaxed whitespace-pre-wrap text-[11px]">
                                  {t.description || <span className="italic text-slate-650">No details provided.</span>}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <h5 className="text-[9px] font-mono font-black uppercase text-indigo-400 tracking-wider">
                                  Sub-tasks Checklist ({t.subtasks.filter(s => s.completed).length}/{t.subtasks.length})
                                </h5>
                                {t.subtasks.length === 0 ? (
                                  <p className="italic text-slate-600 text-[10px]">No checklist loaded.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {t.subtasks.map(sub => (
                                      <label key={sub.id} className="flex items-center gap-2 p-0.5 rounded hover:bg-slate-900/35 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={sub.completed}
                                          onChange={() => handleToggleSubtask(t.id, sub.id, sub.completed)}
                                          className="rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                                        />
                                        <span className={`font-mono text-[10px] truncate ${sub.completed ? "line-through text-slate-600 font-semibold" : "text-slate-350 font-bold"}`}>
                                          {sub.title}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Task History Logs */}
                              <div className="space-y-2 pt-2 border-t border-slate-900/60">
                                <h5 className="text-[9px] font-mono font-black uppercase text-indigo-400 tracking-wider">
                                  Evolution History ({t.logs?.length || 0})
                                </h5>
                                
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                  {!t.logs || t.logs.length === 0 ? (
                                    <p className="italic text-slate-655 text-[10px]">No logs added.</p>
                                  ) : (
                                    [...t.logs].reverse().map((log, idx) => (
                                      <div key={idx} className="p-1.5 bg-slate-950/80 border border-slate-900 rounded-lg space-y-0.5">
                                        <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500">
                                          <span className="font-bold text-indigo-455">👤 {log.author}</span>
                                          <span>{new Date(log.timestamp).toLocaleString('en-US', {
                                            timeZone: 'America/New_York',
                                            month: 'short',
                                            day: '2-digit',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          }).replace(',', '')}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-350 leading-snug font-semibold">{log.message}</p>
                                      </div>
                                    ))
                                  )}
                                </div>

                                <div className="flex gap-1.5 pt-1.5 border-t border-slate-900/40">
                                  <Input
                                    value={newLogAuthor}
                                    onChange={(e) => setNewLogAuthor(e.target.value)}
                                    placeholder="Name"
                                    className="bg-slate-950 border-slate-850 text-slate-200 h-6.5 text-[9px] font-bold w-1/4 shrink-0 px-1.5"
                                  />
                                  <Input
                                    value={newLogMessage}
                                    onChange={(e) => setNewLogMessage(e.target.value)}
                                    placeholder="Add progress update..."
                                    className="bg-slate-950 border-slate-850 text-slate-200 h-6.5 text-[9px] font-medium flex-grow px-1.5"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTaskLog(t.id);
                                      }
                                    }}
                                  />
                                  <Button 
                                    type="button" 
                                    onClick={() => handleAddTaskLog(t.id)}
                                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold h-6.5 text-[9px] px-2 shrink-0"
                                  >
                                    Log
                                  </Button>
                                </div>
                              </div>

                              {/* Quick Move Action buttons inside expanded card */}
                              <div className="flex gap-1.5 pt-2 border-t border-border/40 text-[9px] font-bold">
                                {t.status !== 'Pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'Pending')}
                                    className="flex-1 py-1.5 bg-muted border border-border hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                  >
                                    Move Pending
                                  </button>
                                )}
                                {t.status !== 'In Progress' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                                    className="flex-1 py-1.5 bg-[#F2F0F8] border border-[#C8C0E0] hover:bg-[#E5E1F3] rounded text-[#5A4F7A] hover:text-[#3D3260]"
                                  >
                                    Start Progress
                                  </button>
                                )}
                                {t.status !== 'Completed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'Completed')}
                                    className="flex-1 py-1.5 bg-[#EEF6F3] border border-[#B0D4C8] hover:bg-[#D5EDE8] rounded text-[#3D6E61] hover:text-[#2D5449]"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
      </>
      )}

    </div>
  );
}

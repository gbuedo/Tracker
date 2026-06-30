"use client";

import { useState, useTransition, useMemo } from "react";
import { Task, Subtask } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Search, Plus, List, Kanban, ArrowUpDown, Layers, Clipboard, 
  Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2, User, 
  Calendar, Check, Copy, AlertTriangle, ExternalLink, CheckSquare, Edit
} from "lucide-react";
import { 
  createTaskAction, updateTaskAction, deleteTaskAction, toggleSubtaskAction 
} from "@/actions/tasks";
import { format } from "date-fns";

interface TaskTrackerClientProps {
  initialTasks: Task[];
}

export function TaskTrackerClient({ initialTasks }: TaskTrackerClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [sortBy, setSortBy] = useState<"created_at" | "deadline">("deadline");
  const [groupBy, setGroupBy] = useState<"status" | "assignee">("status");
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

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
        subs
      );

      // Optimistic update
      setTasks(prev => [newTask, ...prev]);
      setDialogOpen(false);
      resetForm();
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
      
      {/* CONTROLS HEADER ROW */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/40 border border-slate-905 p-3.5 rounded-xl backdrop-blur-md">
        
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, description, assignee..."
            className="pl-10 h-10 bg-slate-950/60 border-slate-850 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-505 rounded-xl text-xs font-semibold"
          />
        </div>

        {/* Filters/Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-850 text-[10px] font-bold text-slate-400 h-8 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-slate-200"
            >
              <option value="deadline" className="bg-slate-950">Sort: Deadline</option>
              <option value="created_at" className="bg-slate-950">Sort: Creation Date</option>
            </select>
          </div>

          {/* Grouping */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-850 text-[10px] font-bold text-slate-400 h-8 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-slate-200"
            >
              <option value="status" className="bg-slate-950">Group: Status</option>
              <option value="assignee" className="bg-slate-950">Group: Assignee</option>
            </select>
          </div>

          {/* Layout Toggle (List / Kanban) */}
          <div className="flex bg-slate-950/65 p-0.5 rounded-lg border border-slate-850 gap-0.5 h-8 shrink-0">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-[10px] font-bold rounded flex items-center gap-1.5 transition-all ${
                viewMode === "kanban" ? "bg-indigo-650 text-white shadow shadow-indigo-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-[10px] font-bold rounded flex items-center gap-1.5 transition-all ${
                viewMode === "list" ? "bg-indigo-650 text-white shadow shadow-indigo-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Add Task dialog */}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if(!v) resetForm(); }}>
            <DialogTrigger render={<Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 rounded-xl px-4 text-xs gap-1.5" />}>
              <Plus className="w-4 h-4" />
              New Task
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl w-full bg-slate-950 border-slate-900 text-slate-100 rounded-2xl shadow-2xl p-6">
              <DialogHeader className="border-b border-slate-850 pb-4">
                <DialogTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-mono">
                  <CheckSquare className="w-5 h-5 text-indigo-400 animate-pulse" />
                  CREATE TASK WORKFLOW
                </DialogTitle>
                <DialogDescription className="text-slate-450 text-xs">
                  Create a tracking task, delegate it to an operator, set a timeline schedule, and draft initial subtasks.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateTask} className="space-y-4 pt-4 text-xs font-semibold text-slate-300">
                <div className="grid gap-1.5">
                  <Label htmlFor="task_title" className="text-slate-200 uppercase text-[10px] tracking-wider">Task Title*</Label>
                  <Input 
                    id="task_title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Confirm ocean booking with Maersk"
                    className="bg-slate-900 border-slate-800 text-slate-100 h-10"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="task_desc" className="text-slate-200 uppercase text-[10px] tracking-wider">Description / Instructions</Label>
                  <textarea 
                    id="task_desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter details, file numbers, custom codes, carrier emails..."
                    className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_assignee" className="text-slate-200 uppercase text-[10px] tracking-wider">Assignee / Staff</Label>
                    <Input 
                      id="task_assignee"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="bg-slate-900 border-slate-800 text-slate-100 h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_start" className="text-slate-200 uppercase text-[10px] tracking-wider">Start Date</Label>
                    <Input 
                      id="task_start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="task_due" className="text-slate-200 uppercase text-[10px] tracking-wider">Deadline Date</Label>
                    <Input 
                      id="task_due"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                    />
                  </div>
                </div>

                {/* Subtask Draft List */}
                <div className="border-t border-slate-900 pt-4 space-y-3">
                  <Label className="text-slate-200 uppercase text-[10px] tracking-wider block">Add Initial Subtasks Checklist</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="e.g. Submit customs clearance filing..."
                      className="bg-slate-900 border-slate-800 text-slate-200 h-9"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddSubtaskField}
                      className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold h-9"
                    >
                      Add
                    </Button>
                  </div>

                  {subtasksList.length > 0 && (
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 max-h-28 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-400">
                      {subtasksList.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-950/20 last:border-b-0">
                          <span>• {t}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSubtaskField(idx)}
                            className="text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 p-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setDialogOpen(false); resetForm(); }}
                    className="bg-transparent border-slate-800 text-slate-400 hover:text-white rounded-xl h-10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6"
                  >
                    {isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
 
          {/* Edit Task dialog */}
          <Dialog open={editDialogOpen} onOpenChange={(v) => { setEditDialogOpen(v); }}>
            <DialogContent className="sm:max-w-2xl w-full bg-slate-950 border-slate-900 text-slate-100 rounded-2xl shadow-2xl p-6">
              <DialogHeader className="border-b border-slate-850 pb-4">
                <DialogTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-mono">
                  <Edit className="w-5 h-5 text-yellow-500 animate-pulse" />
                  EDIT TASK DETAILS
                </DialogTitle>
                <DialogDescription className="text-slate-450 text-xs">
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
                <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setEditDialogOpen(false); }}
                    className="bg-transparent border-slate-800 text-slate-400 hover:text-white rounded-xl h-10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-xl h-10 px-6"
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
        <div className="bg-[#050507] border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-500 font-mono uppercase tracking-widest border-b border-slate-900">
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
                    <tr key={t.id} className="border-b border-slate-900 last:border-b-0 hover:bg-slate-900/20 transition-all">
                      <td colSpan={7} className="p-0">
                        <div 
                          onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                          className="flex w-full items-center p-3 cursor-pointer hover:text-white transition-all text-slate-350"
                        >
                          <span className="w-16 text-center font-mono text-[10px] text-slate-600 font-bold shrink-0">#{t.id}</span>
                          
                          <div className="flex-grow font-bold text-slate-200 pl-2 pr-4 min-w-0 truncate">
                            {t.title}
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
                              className="bg-slate-950 text-slate-300 border border-slate-850 rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer outline-none focus:ring-0"
                            >
                              <option value="Pending" className="text-slate-400 bg-slate-950">Pending</option>
                              <option value="In Progress" className="text-indigo-400 bg-slate-950">In Progress</option>
                              <option value="Completed" className="text-emerald-400 bg-slate-950">Completed</option>
                            </select>
                          </div>

                          <div className="w-32 flex items-center justify-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditDialog(t)}
                              className="p-1.5 bg-slate-950 border border-slate-855 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                              title="Edit Task"
                            >
                              <Edit className="w-3.5 h-3.5 text-yellow-500" />
                            </button>
                            <button
                              onClick={() => handleCopyTaskReminder(t)}
                              className="p-1.5 bg-slate-950 border border-slate-855 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-all relative"
                              title="Copy Whatsapp Reminder"
                            >
                              {copySuccessId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 bg-rose-950/20 border border-rose-955 rounded-lg text-rose-450 hover:text-rose-350 hover:border-rose-900 transition-all"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="p-1.5 bg-slate-950 border border-slate-855 rounded-lg text-slate-450 hover:text-white"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Detail Panel */}
                        {isExpanded && (
                          <div className="bg-[#050507] border-t border-slate-900 p-4 pl-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-450 animate-in slide-in-from-top-2 duration-155">
                            
                            {/* Left description */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-mono font-black uppercase text-indigo-400 tracking-wider">Instructions / Description</h4>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {t.description || <span className="italic text-slate-600">No description provided for this task. Click Edit to add details.</span>}
                              </p>
                              
                              <div className="flex gap-4 pt-3 font-mono text-[10px] text-slate-500">
                                <div>Created At: {format(new Date(t.created_at), 'yyyy-MM-dd HH:mm')}</div>
                                <div>Status: <span className="font-bold text-slate-350">{t.status}</span></div>
                              </div>
                            </div>

                            {/* Subtask list */}
                            <div className="space-y-3 bg-[#0a0a0c] border border-slate-900 rounded-xl p-3.5">
                              <h4 className="text-[10px] font-mono font-black uppercase text-indigo-400 tracking-wider">
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
                            <div className="space-y-3 bg-[#0a0a0c] border border-slate-900 rounded-xl p-3.5">
                              <h4 className="text-[10px] font-mono font-black uppercase text-indigo-400 tracking-wider">
                                Task Evolution History ({t.logs?.length || 0})
                              </h4>
                              
                              {/* Logs Feed List */}
                              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                {!t.logs || t.logs.length === 0 ? (
                                  <p className="italic text-slate-600 text-[10px] py-1">No updates logged yet.</p>
                                ) : (
                                  [...t.logs].reverse().map((log, idx) => (
                                    <div key={idx} className="p-2 bg-slate-950/80 border border-slate-900 rounded-lg space-y-1">
                                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                                        <span className="font-bold text-indigo-400">👤 {log.author}</span>
                                        <span>{new Date(log.timestamp).toLocaleString('en-US', {
                                          timeZone: 'America/New_York',
                                          month: 'short',
                                          day: '2-digit',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        }).replace(',', '')}</span>
                                      </div>
                                      <p className="text-[10.5px] text-slate-350 leading-snug font-semibold">{log.message}</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Add Log Form */}
                              <div className="space-y-2 pt-2 border-t border-slate-900/60">
                                <div className="flex gap-2">
                                  <Input
                                    value={newLogAuthor}
                                    onChange={(e) => setNewLogAuthor(e.target.value)}
                                    placeholder="Name"
                                    className="bg-slate-950 border-slate-850 text-slate-200 h-7 text-[10px] font-bold w-1/3 shrink-0"
                                  />
                                  <Input
                                    value={newLogMessage}
                                    onChange={(e) => setNewLogMessage(e.target.value)}
                                    placeholder="Add progress log..."
                                    className="bg-slate-950 border-slate-850 text-slate-200 h-7 text-[10px] font-medium flex-grow"
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
                                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold h-7 text-[10px] px-2.5 shrink-0"
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
                <div className="flex justify-between items-center bg-[#0a0a0c] border border-slate-900 px-4 py-2.5 rounded-xl shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]"></span>
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-200">
                      {groupBy === "status" ? `${groupName} Column` : `Assignee: ${groupName}`}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-indigo-400 border border-slate-850 rounded">
                    {groupList.length} Tasks
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-grow bg-slate-950/30 border border-dashed border-slate-900 rounded-2xl p-3 space-y-3 overflow-y-auto min-h-[400px]">
                  {groupList.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-12 text-slate-650 italic text-xs">No tasks in this column</div>
                  ) : (
                    groupList.map(t => {
                      const isExpanded = expandedTaskId === t.id;
                      const dColor = getDeadlineColor(t);
                      return (
                        <div 
                          key={t.id} 
                          className={`bg-[#0a0a0c] border rounded-xl overflow-hidden hover:border-slate-800 transition-all duration-200 shadow-md flex flex-col relative ${
                            isExpanded ? "border-slate-750" : "border-slate-900"
                          }`}
                        >
                          {/* Colored priority border on top of card */}
                          <div className={`h-1 w-full ${
                            t.status === 'Completed' ? 'bg-emerald-500' : t.status === 'In Progress' ? 'bg-indigo-500' : 'bg-slate-750'
                          }`} />

                          <div className="p-4 flex flex-col space-y-3">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-mono text-[9px] text-slate-600 font-extrabold">#{t.id}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditDialog(t)}
                                  className="text-slate-500 hover:text-white p-1 hover:bg-slate-900 rounded"
                                  title="Edit Task"
                                >
                                  <Edit className="w-3 h-3 text-yellow-500" />
                                </button>
                                <button
                                  onClick={() => handleCopyTaskReminder(t)}
                                  className="text-slate-500 hover:text-white p-1 hover:bg-slate-900 rounded"
                                  title="Copy Reminder"
                                >
                                  {copySuccessId === t.id ? <Check className="w-3 h-3 text-emerald-450" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-rose-500/80 hover:text-rose-455 p-1 hover:bg-rose-950/20 rounded"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Card title */}
                            <h4 
                              onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                              className="font-bold text-slate-200 text-xs hover:text-indigo-400 cursor-pointer transition-colors leading-tight"
                            >
                              {t.title}
                            </h4>

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
                              className="w-full flex items-center justify-center py-1 border-t border-slate-900 mt-2 text-[9px] font-bold text-slate-550 hover:text-slate-300 gap-1 transition-colors"
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
                              <div className="flex gap-1.5 pt-2 border-t border-slate-900/40 text-[9px] font-bold">
                                {t.status !== 'Pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'Pending')}
                                    className="flex-1 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
                                  >
                                    Move Pending
                                  </button>
                                )}
                                {t.status !== 'In Progress' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                                    className="flex-1 py-1.5 bg-indigo-950/20 border border-indigo-900/30 hover:bg-indigo-950/40 rounded text-indigo-400 hover:text-indigo-300"
                                  >
                                    Start Progress
                                  </button>
                                )}
                                {t.status !== 'Completed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'Completed')}
                                    className="flex-1 py-1.5 bg-emerald-950/20 border border-emerald-900/30 hover:bg-emerald-950/40 rounded text-emerald-400 hover:text-emerald-350"
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

    </div>
  );
}

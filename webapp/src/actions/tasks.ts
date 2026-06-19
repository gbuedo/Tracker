"use server";

import * as db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Subtask, Task } from "@/lib/types";

export async function createTaskAction(
  title: string,
  description: string | null,
  assignee: string | null,
  start_date: string | null,
  deadline: string | null,
  subtasks: Subtask[] = []
) {
  const data = await db.createTask(title, description, assignee, start_date, deadline, subtasks);
  revalidatePath("/task-tracker");
  revalidatePath("/");
  return data;
}

export async function updateTaskAction(id: number, fields: Partial<Task>) {
  const data = await db.updateTask(id, fields);
  revalidatePath("/task-tracker");
  revalidatePath("/");
  return data;
}

export async function toggleSubtaskAction(taskId: number, subtaskId: string, completed: boolean) {
  const tasks = await db.getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error("Task not found");
  
  const updatedSubtasks = task.subtasks.map(sub => {
    if (sub.id === subtaskId) {
      return { ...sub, completed };
    }
    return sub;
  });
  
  const data = await db.updateTask(taskId, { subtasks: updatedSubtasks });
  revalidatePath("/task-tracker");
  return data;
}

export async function deleteTaskAction(id: number) {
  await db.deleteTask(id);
  revalidatePath("/task-tracker");
  revalidatePath("/");
}

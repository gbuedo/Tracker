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
  subtasks: Subtask[] = [],
  shipment_id: number | null = null,
  shipment_reference: string | null = null
) {
  const data = await db.createTask(title, description, assignee, start_date, deadline, subtasks, shipment_id, shipment_reference);
  revalidatePath("/task-tracker");
  revalidatePath("/");
  if (shipment_id) {
    revalidatePath(`/shipment/${shipment_id}`);
  }
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

export async function getTasksAction() {
  return await db.getTasks();
}

export async function createExpirationTaskAction(
  title: string,
  description: string | null,
  assignee: string | null,
  due_date: string,
  category: any,
  recurrence_period: any,
  reminder_days_before: number = 7
) {
  const data = await db.createTask(
    title,
    description,
    assignee,
    new Date().toISOString().split("T")[0],
    due_date,
    [],
    null,
    null,
    {
      task_type: "expiration",
      category,
      due_date,
      recurrence_period,
      reminder_days_before
    }
  );
  revalidatePath("/task-tracker");
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/shipping-instructions");
  return data;
}

export async function toggleTaskCompleteWithRolloverAction(id: number) {
  const data = await db.toggleTaskCompleteWithRollover(id);
  revalidatePath("/task-tracker");
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/shipping-instructions");
  return data;
}

export async function deleteTaskAction(id: number) {
  await db.deleteTask(id);
  revalidatePath("/task-tracker");
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/shipping-instructions");
}


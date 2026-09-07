import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getExactDaysRemaining(dueDateStr?: string | null): number {
  if (!dueDateStr) return 999;
  const parts = dueDateStr.split("T")[0].split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return 999;
  }
  const [dueYear, dueMonth, dueDay] = parts;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueMidnight = new Date(dueYear, dueMonth - 1, dueDay).getTime();
  const diffTime = dueMidnight - todayMidnight;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateNextDueDate(currentDueDate: string, recurrence: string): string {
  if (!currentDueDate) return new Date().toISOString().split("T")[0];
  const parts = currentDueDate.split("T")[0].split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return currentDueDate;
  }
  const [year, month, day] = parts;
  const rec = (recurrence || "").toLowerCase().trim();
  if (rec === "none" || rec === "" || rec === "one-time") return currentDueDate;

  const addMonths = (y: number, m: number, d: number, monthsToAdd: number): string => {
    let targetMonth = m + monthsToAdd;
    let targetYear = y;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(d, daysInTargetMonth);
    return targetYear + "-" + String(targetMonth).padStart(2, "0") + "-" + String(targetDay).padStart(2, "0");
  };

  const addYears = (y: number, m: number, d: number, yearsToAdd: number): string => {
    const targetYear = y + yearsToAdd;
    const daysInTargetMonth = new Date(targetYear, m, 0).getDate();
    const targetDay = Math.min(d, daysInTargetMonth);
    return targetYear + "-" + String(m).padStart(2, "0") + "-" + String(targetDay).padStart(2, "0");
  };

  if (rec.includes("5 year")) return addYears(year, month, day, 5);
  if (rec.includes("3 year")) return addYears(year, month, day, 3);
  if (rec.includes("2 year") || rec.includes("bi-yearly")) return addYears(year, month, day, 2);
  if (rec.includes("6 month") || rec.includes("bi-annually") || rec.includes("semi-annually")) return addMonths(year, month, day, 6);
  if (rec.includes("annually") || rec.includes("yearly") || rec.includes("1 year") || rec.includes("12 month")) return addYears(year, month, day, 1);
  if (rec.includes("4 month")) return addMonths(year, month, day, 4);
  if (rec.includes("quarterly") || rec.includes("3 month")) return addMonths(year, month, day, 3);
  if (rec.includes("2 month") || rec.includes("bi-monthly")) return addMonths(year, month, day, 2);
  if (rec.includes("monthly") || rec.includes("1 month")) return addMonths(year, month, day, 1);

  if (!isNaN(Number(recurrence))) {
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + Number(recurrence));
    return dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, "0") + "-" + String(dateObj.getDate()).padStart(2, "0");
  }

  return addMonths(year, month, day, 1);
}

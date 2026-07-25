"use client";

import { useState } from "react";
import { updateShipmentStatus } from "@/actions/shipments";
import { Status } from "@/lib/types";
import { Clock } from "lucide-react";

interface StatusSelectorProps {
  shipmentId: number;
  currentStatusId: number | null;
  statuses: Status[];
}

export function StatusSelector({ shipmentId, currentStatusId, statuses }: StatusSelectorProps) {
  const [selectedId, setSelectedId] = useState<number>(currentStatusId || 1);
  const [isPending, setIsPending] = useState(false);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const statusId = Number(e.target.value);
    setSelectedId(statusId);
    setIsPending(true);
    try {
      await updateShipmentStatus(shipmentId, statusId);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsPending(false);
    }
  }

  const activeStatus = statuses.find(s => s.id === selectedId);

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm text-sm">
      <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Status:</span>
      {isPending ? (
        <Clock className="animate-spin w-4 h-4 text-sky-400 shrink-0" />
      ) : (
        <div 
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" 
          style={{ backgroundColor: activeStatus?.color_code || "#94a3b8" }}
        />
      )}
      <select
        value={selectedId}
        onChange={handleStatusChange}
        disabled={isPending}
        className="bg-transparent text-slate-200 border-none outline-none font-semibold cursor-pointer pr-8 text-xs focus:ring-0"
      >
        {statuses.map((s) => (
          <option key={s.id} value={s.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold">
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

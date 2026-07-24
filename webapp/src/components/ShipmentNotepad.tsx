"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Save, Check, RefreshCw } from "lucide-react";
import { saveShipmentNotes } from "@/actions/shipments";

interface ShipmentNotepadProps {
  shipmentId: number;
  initialNotes: string;
}

export function ShipmentNotepad({ shipmentId, initialNotes }: ShipmentNotepadProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSave = async (currentNotes: string) => {
    setStatus("saving");
    try {
      await saveShipmentNotes(shipmentId, currentNotes);
      setStatus("saved");
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setStatus("idle");

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    // Auto-save after 1.5 seconds of inactivity
    saveTimeout.current = setTimeout(() => {
      handleSave(val);
    }, 1500);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  return (
    <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
      <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800/60 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-slate-700 dark:text-slate-200 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-yellow-500" />
          File Notepad / Notes
        </CardTitle>
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          {status === "saving" && (
            <span className="flex items-center gap-1 text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-500" />
              Saving...
            </span>
          )}
          {status === "saved" && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Saved
            </span>
          )}
          {status === "error" && (
            <span className="text-rose-500">Save Error</span>
          )}
          {status === "idle" && (
            <span className="text-slate-400 dark:text-slate-500">Auto-saves changes</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Type notes or general shipment information here..."
          className="w-full h-40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs focus:ring-1 focus:ring-yellow-500 focus:outline-none resize-none font-sans"
        />
        <div className="flex justify-end">
          <button
            onClick={() => handleSave(notes)}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-lg text-2xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Force Save Note
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

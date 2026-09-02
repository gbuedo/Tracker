"use client";

import React, { useState, useRef, useEffect } from "react";
import { Status } from "@/lib/types";
import { Layers, ChevronDown, Check, X, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  statuses: Status[];
  selectedStatuses: string[];
  globalStatusCounts: Record<string, number>;
  onToggleStatus: (statusName: string) => void;
  onClearFilters: () => void;
}

export function MilestoneMultiSelect({
  statuses,
  selectedStatuses,
  globalStatusCounts,
  onToggleStatus,
  onClearFilters
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStatuses = statuses.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left select-none" ref={dropdownRef}>
      
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
          selectedStatuses.length > 0
            ? "bg-[#FDF1EE] border-[#F0C5BC] text-[#8B4E43] shadow-sm"
            : "bg-muted border-border text-foreground hover:bg-accent"
        }`}
      >
        <Layers className="w-3.5 h-3.5 text-[#5A4F7A]" />
        <span>
          {selectedStatuses.length === 0
            ? "Milestones: All"
            : `Milestones (${selectedStatuses.length})`}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* DROPDOWN POPOVER MENU */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-2 space-y-2 font-sans animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header & Search Input */}
          <div className="flex items-center justify-between pb-1 border-b border-border px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#5A4F7A]" />
              Filter Milestones
            </span>
            {selectedStatuses.length > 0 && (
              <button
                onClick={() => {
                  onClearFilters();
                }}
                className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search status..."
              className="w-full bg-background border border-input rounded-md pl-6 pr-2 py-1 text-[10px] font-medium text-foreground outline-none focus:ring-1 focus:ring-[#5A4F7A]"
            />
          </div>

          {/* Options Checklist */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 border-t border-border pt-1">
            {filteredStatuses.map(status => {
              const isChecked = selectedStatuses.includes(status.name);
              const count = globalStatusCounts[status.name] || 0;

              return (
                <label
                  key={status.id}
                  onClick={() => onToggleStatus(status.name)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-[#F2F0F8] dark:bg-slate-800 text-foreground font-bold border border-[#C8C0E0]/60"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                      isChecked ? "bg-[#5A4F7A] border-[#5A4F7A] text-white" : "border-input bg-background"
                    }`}>
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: status.color_code }}
                    />
                    <span className="truncate">{status.name}</span>
                  </div>

                  <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.25 rounded border border-border shrink-0 ml-1">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}

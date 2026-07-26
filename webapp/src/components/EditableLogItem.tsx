"use client";

import { useState } from "react";
import { updateLog, deleteLog } from "@/actions/shipments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Check, X, Globe, Lock, DollarSign, Tag, Circle } from "lucide-react";
import { Log } from "@/lib/types";

interface EditableLogItemProps {
  log: Log;
  shipmentId: number;
}

export function EditableLogItem({ log, shipmentId }: EditableLogItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [eventText, setEventText] = useState(log.event_text);
  const [isExternal, setIsExternal] = useState(log.is_external);
  const [amount, setAmount] = useState<string>(log.amount !== null ? String(log.amount) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!eventText.trim()) return;
    setIsSaving(true);
    try {
      const parsedAmount = amount.trim() === "" ? null : parseFloat(amount);
      let textToSend = eventText.trim();
      if (log.status_id) {
        textToSend += ` ||STATUS_ID:${log.status_id}||`;
      }
      await updateLog(log.id, shipmentId, {
        event_text: textToSend,
        is_external: isExternal,
        amount: parsedAmount,
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to update tracking log:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this operational tracking event?")) {
      setIsDeleting(true);
      try {
        await deleteLog(log.id, shipmentId);
      } catch (e) {
        console.error("Failed to delete tracking log:", e);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="relative group">
      {/* Timeline Icon Node indicator */}
      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border bg-card flex items-center justify-center transition-all ${
        isExternal 
          ? 'border-[#7BB5A0] text-[#7BB5A0] shadow-sm' 
          : 'border-border text-muted-foreground'
      }`}>
        <Circle className="w-1.5 h-1.5 fill-current" />
      </div>

      {/* Activities feed Card */}
      <div className="p-4 rounded-xl bg-card border border-border hover:shadow-md transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <time className="text-xs font-mono font-semibold text-slate-500">
            {new Date(log.created_at).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }).replace(',', ' •')}
          </time>
          
          <div className="flex items-center gap-2">
            {log.status && (
              <span 
                className="inline-flex items-center gap-1.5 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
                style={{ 
                  color: log.status.color_code, 
                  borderColor: `${log.status.color_code}40`, 
                  backgroundColor: `${log.status.color_code}10` 
                }}
              >
                <Circle className="w-1.5 h-1.5 fill-current" />
                {log.status.name}
              </span>
            )}

            {log.billable_concept && (
              <span className="inline-flex items-center gap-1 bg-[#FDF8F0] text-[#7A5A20] border border-[#E8D0A0] px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                <Tag className="w-2.5 h-2.5" />
                {log.billable_concept.name}
              </span>
            )}

            {isEditing ? (
              <button
                type="button"
                onClick={() => setIsExternal(!isExternal)}
                className={`inline-flex items-center gap-1 text-[10px] border px-2 py-0.5 rounded font-bold uppercase transition-all ${
                  isExternal 
                    ? 'bg-[#EEF6F3] text-[#3D6E61] border-[#B0D4C8] hover:bg-[#D8EDE8]' 
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {isExternal ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {isExternal ? "Visible to Client" : "Staff Only"}
              </button>
            ) : (
              log.is_external ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-[#EEF6F3] text-[#3D6E61] border border-[#B0D4C8] px-2 py-0.5 rounded font-bold uppercase">
                  <Globe className="w-2.5 h-2.5" />
                  Visible to Client
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded font-bold uppercase">
                  <Lock className="w-2.5 h-2.5" />
                  Internal Only
                </span>
              )
            )}

            {/* Action buttons */}
            {!isEditing ? (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded text-muted-foreground hover:text-[#3A6580] hover:bg-muted transition-colors"
                  title="Edit message"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              className="bg-card border-border text-foreground text-sm font-semibold focus-visible:ring-[#A89ACC]/50"
            />
            {log.amount !== null && (
              <div className="flex items-center gap-1.5 max-w-[150px]">
                <div className="relative flex-grow">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7 pr-1.5 h-8 bg-card border-border text-foreground text-xs font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setIsEditing(false);
                  setEventText(log.event_text);
                  setIsExternal(log.is_external);
                  setAmount(log.amount !== null ? String(log.amount) : "");
                }}
                className="bg-transparent border-border text-muted-foreground hover:text-foreground h-7 text-[10px]"
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSaving || !eventText.trim()}
                onClick={handleSave}
                className="bg-[#A89ACC] hover:bg-[#8E7AB5] text-white h-7 text-[10px] font-bold"
              >
                {isSaving ? "Saving..." : <span className="flex items-center"><Check className="w-3 h-3 mr-1" /> Save</span>}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {log.event_text}
            </p>

            {log.amount && (
              <div className={`mt-2.5 flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-md w-max border ${
                log.amount_type === 'selling' 
                  ? 'text-[#3A6580] bg-[#EEF5FA] border-[#B0D0E8]' 
                  : 'text-[#8B4E43] bg-[#FDF1EE] border-[#F0C5BC]'
              }`}>
                <DollarSign className="w-3.5 h-3.5" />
                {log.amount_type === 'selling' ? 'Selling' : 'Cost'}: +${Number(log.amount).toFixed(2)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

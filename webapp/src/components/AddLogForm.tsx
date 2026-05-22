"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLog } from "@/actions/shipments";
import { Eye, EyeOff, Send, DollarSign, Tag, FileText } from "lucide-react";
import { BillableConcept } from "@/lib/types";

interface AddLogFormProps {
  shipmentId: number;
  billableConcepts: BillableConcept[];
}

export function AddLogForm({ shipmentId, billableConcepts }: AddLogFormProps) {
  const [isExternal, setIsExternal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [amountType, setAmountType] = useState<"cost" | "selling">("cost");

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      const event_text = formData.get("event_text") as string;
      const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
      const amount_type = formData.get("amount_type") as "cost" | "selling" || "cost";
      const billable_concept_id = selectedConcept ? Number(selectedConcept) : null;

      await addLog({
        shipment_id: shipmentId,
        event_text,
        is_external: isExternal,
        billable_concept_id,
        amount,
        amount_type,
      });

      // Clear input fields
      const input = document.getElementById("event_text") as HTMLInputElement;
      if (input) input.value = "";
      
      const amountInput = document.getElementById("amount") as HTMLInputElement;
      if (amountInput) amountInput.value = "";
      
      setSelectedConcept("");
      setIsExternal(false);
      setAmountType("cost");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4 backdrop-blur-md">
      <div className="space-y-1.5">
        <Label htmlFor="event_text" className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          Add an update to the shipment timeline
        </Label>
        <Input 
          id="event_text" 
          name="event_text" 
          placeholder="e.g. Flight departed from MIA, custom clearance paperwork prepared..." 
          required 
          className="bg-slate-950/80 border-slate-800 text-slate-200 placeholder:text-slate-650 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/80 h-10 rounded-lg" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Billable Concept dropdown */}
        <div className="space-y-1">
          <Label htmlFor="billable_concept_id" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Concept (Optional)
          </Label>
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 h-10">
            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              id="billable_concept_id"
              value={selectedConcept}
              onChange={(e) => setSelectedConcept(e.target.value)}
              className="bg-transparent text-slate-300 border-none outline-none font-semibold text-xs cursor-pointer w-full focus:ring-0"
            >
              <option value="" className="bg-slate-950 text-slate-500">None (Log)</option>
              {billableConcepts.map((concept) => (
                <option key={concept.id} value={concept.id} className="bg-slate-950 text-slate-300">
                  {concept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Amount (Optional)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input 
              id="amount"
              name="amount" 
              type="number"
              step="any"
              placeholder="0.00" 
              className="pl-8 bg-slate-950/80 border-slate-800 text-slate-300 placeholder:text-slate-650 h-10 rounded-lg font-mono text-xs font-semibold" 
            />
          </div>
        </div>

        {/* Amount Type select */}
        <div className="space-y-1">
          <Label htmlFor="amount_type" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Type
          </Label>
          <div className="flex gap-1 h-10 bg-slate-950/80 border border-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAmountType("cost")}
              className={`flex-1 text-[10px] font-extrabold rounded transition-all uppercase ${
                amountType === "cost"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Cost
            </button>
            <button
              type="button"
              onClick={() => setAmountType("selling")}
              className={`flex-1 text-[10px] font-extrabold rounded transition-all uppercase ${
                amountType === "selling"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Selling
            </button>
            <input type="hidden" name="amount_type" value={amountType} />
          </div>
        </div>

        {/* Visibility toggler button */}
        <div className="space-y-1 flex flex-col justify-end">
          <Button
            type="button"
            variant="outline"
            className={`h-10 text-[10px] font-extrabold transition-all border rounded-lg uppercase ${
              isExternal 
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'border-slate-800 bg-slate-950/80 text-slate-500 hover:text-slate-300'
            }`}
            onClick={() => setIsExternal(!isExternal)}
          >
            {isExternal ? (
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-400" /> Client Visible</span>
            ) : (
              <span className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5 text-slate-500" /> Staff Only</span>
            )}
          </Button>
        </div>
      </div>

      {/* Form Submission button */}
      <div className="flex justify-end pt-1">
        <Button 
          type="submit" 
          disabled={isPending} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 shadow-lg shadow-indigo-500/20 text-xs rounded-lg transition-all"
        >
          <Send className="w-3.5 h-3.5 mr-2" /> Post Operational Update
        </Button>
      </div>
    </form>
  );
}

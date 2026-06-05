"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLog, createBillableConcept } from "@/actions/shipments";
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
  const [customConceptName, setCustomConceptName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleConceptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedConcept(val);
    if (val === "new_concept") {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      const event_text = formData.get("event_text") as string;
      const cost_amount = formData.get("cost_amount") ? Number(formData.get("cost_amount")) : null;
      const selling_amount = formData.get("selling_amount") ? Number(formData.get("selling_amount")) : null;
      
      let billable_concept_id = selectedConcept && selectedConcept !== "new_concept" ? Number(selectedConcept) : null;

      // Handle custom concept creation if chosen
      if (selectedConcept === "new_concept" && customConceptName.trim()) {
        const newConcept = await createBillableConcept(customConceptName.trim());
        billable_concept_id = newConcept.id;
      }

      // If both cost and selling are defined, log them as two separate logs to support dual amounts
      if (cost_amount !== null && selling_amount !== null) {
        await addLog({
          shipment_id: shipmentId,
          event_text: `${event_text} (Cost Entry)`,
          is_external: isExternal,
          billable_concept_id,
          amount: cost_amount,
          amount_type: "cost"
        });
        await addLog({
          shipment_id: shipmentId,
          event_text: `${event_text} (Selling Entry)`,
          is_external: isExternal,
          billable_concept_id,
          amount: selling_amount,
          amount_type: "selling"
        });
      } else if (cost_amount !== null) {
        await addLog({
          shipment_id: shipmentId,
          event_text,
          is_external: isExternal,
          billable_concept_id,
          amount: cost_amount,
          amount_type: "cost"
        });
      } else if (selling_amount !== null) {
        await addLog({
          shipment_id: shipmentId,
          event_text,
          is_external: isExternal,
          billable_concept_id,
          amount: selling_amount,
          amount_type: "selling"
        });
      } else {
        // Log without amount
        await addLog({
          shipment_id: shipmentId,
          event_text,
          is_external: isExternal,
          billable_concept_id: null,
          amount: null,
          amount_type: null
        });
      }

      // Clear input fields
      const input = document.getElementById("event_text") as HTMLInputElement;
      if (input) input.value = "";
      
      const costInput = document.getElementById("cost_amount") as HTMLInputElement;
      if (costInput) costInput.value = "";

      const sellInput = document.getElementById("selling_amount") as HTMLInputElement;
      if (sellInput) sellInput.value = "";
      
      setSelectedConcept("");
      setCustomConceptName("");
      setShowCustomInput(false);
      setIsExternal(false);
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
        <div className="space-y-1 col-span-1">
          <Label htmlFor="billable_concept_id" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Concept (Optional)
          </Label>
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 h-10">
            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              id="billable_concept_id"
              value={selectedConcept}
              onChange={handleConceptChange}
              className="bg-transparent text-slate-300 border-none outline-none font-semibold text-xs cursor-pointer w-full focus:ring-0"
            >
              <option value="" className="bg-slate-950 text-slate-500">None (Log)</option>
              {billableConcepts.map((concept) => (
                <option key={concept.id} value={concept.id} className="bg-slate-950 text-slate-300">
                  {concept.name}
                </option>
              ))}
              <option value="new_concept" className="bg-slate-950 text-sky-400 font-bold">+ Add Custom Concept...</option>
            </select>
          </div>
        </div>

        {/* Cost Amount input */}
        <div className="space-y-1">
          <Label htmlFor="cost_amount" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Cost Amount ($)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input 
              id="cost_amount"
              name="cost_amount" 
              type="number"
              step="any"
              placeholder="0.00" 
              className="pl-8 bg-slate-950/80 border-slate-800 text-slate-300 placeholder:text-slate-650 h-10 rounded-lg font-mono text-xs font-semibold" 
            />
          </div>
        </div>

        {/* Selling Amount input */}
        <div className="space-y-1">
          <Label htmlFor="selling_amount" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            Selling Amount ($)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input 
              id="selling_amount"
              name="selling_amount" 
              type="number"
              step="any"
              placeholder="0.00" 
              className="pl-8 bg-slate-950/80 border-slate-800 text-slate-300 placeholder:text-slate-650 h-10 rounded-lg font-mono text-xs font-semibold" 
            />
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

      {/* Show custom concept name text field if selected */}
      {showCustomInput && (
        <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-850 rounded-lg animate-in fade-in duration-200">
          <Label htmlFor="custom_concept_name" className="text-[10px] uppercase font-bold text-slate-400">Custom Concept Name</Label>
          <Input
            id="custom_concept_name"
            value={customConceptName}
            onChange={(e) => setCustomConceptName(e.target.value)}
            placeholder="Enter custom billable concept name..."
            className="bg-slate-950/80 border-slate-800 text-slate-200 text-xs h-9"
          />
        </div>
      )}

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

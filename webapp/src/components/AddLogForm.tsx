"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLog, createBillableConcept } from "@/actions/shipments";
import { Eye, EyeOff, Send, DollarSign, Tag, FileText, Activity } from "lucide-react";
import { BillableConcept, Status } from "@/lib/types";

interface AddLogFormProps {
  shipmentId: number;
  billableConcepts: BillableConcept[];
  statuses: Status[];
}

export function AddLogForm({ shipmentId, billableConcepts, statuses }: AddLogFormProps) {
  const [isExternal, setIsExternal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [customConceptName, setCustomConceptName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

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
      const status_id = selectedStatus ? Number(selectedStatus) : null;

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
          amount_type: "cost",
          status_id
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
          amount_type: "cost",
          status_id
        });
      } else if (selling_amount !== null) {
        await addLog({
          shipment_id: shipmentId,
          event_text,
          is_external: isExternal,
          billable_concept_id,
          amount: selling_amount,
          amount_type: "selling",
          status_id
        });
      } else {
        // Log without amount
        await addLog({
          shipment_id: shipmentId,
          event_text,
          is_external: isExternal,
          billable_concept_id: null,
          amount: null,
          amount_type: null,
          status_id
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
      setSelectedStatus("");
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
    <form action={handleSubmit} className="p-5 bg-muted border border-border rounded-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event_text" className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#A89ACC]" />
          Add an update to the shipment timeline
        </Label>
        <Input 
          id="event_text" 
          name="event_text" 
          placeholder="e.g. Flight departed from MIA, custom clearance paperwork prepared..." 
          required 
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#A89ACC]/50 focus-visible:border-[#A89ACC]/80 h-10 rounded-lg" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Milestone Status dropdown */}
        <div className="space-y-1 col-span-1">
          <Label htmlFor="status_id" className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold min-h-[32px] flex items-end pb-1">
            Milestone (Optional)
          </Label>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 h-10">
            <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              id="status_id"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-foreground border-none outline-none font-semibold text-xs cursor-pointer w-full focus:ring-0"
            >
              <option value="" className="bg-background text-muted-foreground">None (No change)</option>
              {statuses.map((st) => (
                <option key={st.id} value={st.id} className="bg-background text-foreground">
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Billable Concept dropdown */}
        <div className="space-y-1 col-span-1">
          <Label htmlFor="billable_concept_id" className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold min-h-[32px] flex items-end pb-1">
            Concept (Optional)
          </Label>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 h-10">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              id="billable_concept_id"
              value={selectedConcept}
              onChange={handleConceptChange}
              className="bg-transparent text-foreground border-none outline-none font-semibold text-xs cursor-pointer w-full focus:ring-0"
            >
              <option value="" className="bg-background text-muted-foreground">None (Log)</option>
              {billableConcepts.map((concept) => (
                <option key={concept.id} value={concept.id} className="bg-background text-foreground">
                  {concept.name}
                </option>
              ))}
              <option value="new_concept" className="bg-background text-[#3A6580] font-bold">+ Add Custom Concept...</option>
            </select>
          </div>
        </div>
        {/* Cost Amount input */}
        <div className="space-y-1">
          <Label htmlFor="cost_amount" className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold min-h-[32px] flex items-end pb-1">
            Cost Amount ($)
          </Label>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 h-10">
            <DollarSign className="w-3.5 h-3.5 text-[#8B4E43] shrink-0" />
            <input 
              id="cost_amount"
              name="cost_amount" 
              type="number"
              step="any"
              placeholder="0.00" 
              className="bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none font-mono text-xs font-semibold w-full focus:ring-0" 
            />
          </div>
        </div>

        {/* Selling Amount input */}
        <div className="space-y-1">
          <Label htmlFor="selling_amount" className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold min-h-[32px] flex items-end pb-1">
            Selling Amount ($)
          </Label>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 h-10">
            <DollarSign className="w-3.5 h-3.5 text-[#3A6580] shrink-0" />
            <input 
              id="selling_amount"
              name="selling_amount" 
              type="number"
              step="any"
              placeholder="0.00" 
              className="bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none font-mono text-xs font-semibold w-full focus:ring-0" 
            />
          </div>
        </div>

        {/* Visibility toggler button */}
        <div className="space-y-1">
          <Label className="opacity-0 select-none hidden sm:flex text-slate-500 text-[10px] uppercase tracking-wider font-bold min-h-[32px] items-end pb-1">&nbsp;</Label>
          <Button
            type="button"
            variant="outline"
            className={`h-10 text-[10px] font-extrabold transition-all border rounded-lg uppercase w-full ${
              isExternal 
                ? 'border-[#7BB5A0] bg-[#EEF6F3] text-[#3D6E61] hover:bg-[#D8EDE8]' 
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setIsExternal(!isExternal)}
          >
            {isExternal ? (
              <span className="flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5 text-[#3D6E61]" /> Client Visible</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5"><EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> Staff Only</span>
            )}
          </Button>
        </div>
      </div>

      {/* Show custom concept name text field if selected */}
      {showCustomInput && (
        <div className="space-y-1.5 p-3.5 bg-card border border-border rounded-lg animate-in fade-in duration-200">
          <Label htmlFor="custom_concept_name" className="text-[10px] uppercase font-bold text-muted-foreground">Custom Concept Name</Label>
          <Input
            id="custom_concept_name"
            value={customConceptName}
            onChange={(e) => setCustomConceptName(e.target.value)}
            placeholder="Enter custom billable concept name..."
            className="bg-muted border-border text-foreground text-xs h-9"
          />
        </div>
      )}

      {/* Form Submission button */}
      <div className="flex justify-end pt-1">
        <Button 
          type="submit" 
          disabled={isPending} 
          className="bg-[#A89ACC] hover:bg-[#8E7AB5] text-white font-bold h-10 px-5 shadow-sm text-xs rounded-lg transition-all"
        >
          <Send className="w-3.5 h-3.5 mr-2" /> Post Operational Update
        </Button>
      </div>
    </form>
  );
}

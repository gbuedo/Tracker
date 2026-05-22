"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitShipment } from "@/actions/shipments";
import { Split, Plus, Clock } from "lucide-react";

interface SplitCargoDialogProps {
  shipmentId: number;
  parentPcs: number | null;
  parentKgs: number | null;
  parentChw: number | null;
}

export function SplitCargoDialog({ shipmentId, parentPcs, parentKgs, parentChw }: SplitCargoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSplit(formData: FormData) {
    setIsPending(true);
    try {
      const pcs = formData.get("pcs") ? Number(formData.get("pcs")) : null;
      const kgs = formData.get("kgs") ? Number(formData.get("kgs")) : null;
      const chw = formData.get("chw") ? Number(formData.get("chw")) : null;

      await splitShipment(shipmentId, { pcs, kgs, chw });
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="flex items-center border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-200" />}>
        <span className="flex items-center"><Split className="w-4 h-4 mr-2 text-indigo-400" /> Split Cargo</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5 text-indigo-400" /> Split Shipment Cargo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a child shipment (Sub-file) for a partial arrival. It will inherit the master file details.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSplit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pcs">Pieces (PCS)</Label>
                <Input 
                  id="pcs" 
                  name="pcs" 
                  type="number"
                  step="any"
                  className="bg-slate-800 border-slate-700 text-white" 
                  placeholder="e.g. 10"
                  defaultValue={parentPcs ? Math.floor(parentPcs / 2) : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kgs">Weight (KGS)</Label>
                <Input 
                  id="kgs" 
                  name="kgs" 
                  type="number"
                  step="any"
                  className="bg-slate-800 border-slate-700 text-white" 
                  placeholder="e.g. 250"
                  defaultValue={parentKgs ? parentKgs / 2 : ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chw">Chargeable Weight (CHW)</Label>
              <Input 
                id="chw" 
                name="chw" 
                type="number"
                step="any"
                className="bg-slate-800 border-slate-700 text-white" 
                placeholder="e.g. 260"
                defaultValue={parentChw ? parentChw / 2 : ""}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending ? <Clock className="animate-spin w-4 h-4 mr-2" /> : <Split className="w-4 h-4 mr-2" />}
              Create Split
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

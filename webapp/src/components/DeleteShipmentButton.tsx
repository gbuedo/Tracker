"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteShipment } from "@/actions/shipments";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteShipmentButtonProps {
  shipmentId: number;
}

export function DeleteShipmentButton({ shipmentId }: DeleteShipmentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await deleteShipment(shipmentId);
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="flex items-center justify-center border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-900/50 text-rose-400 hover:text-rose-300 transition-colors p-2 h-9 w-9 shrink-0" title="Delete Shipment" />}>
        <span className="flex items-center justify-center"><Trash2 className="w-4 h-4" /></span>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
            Delete Shipment File
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            This action is permanent and cannot be undone. It will remove Shipment #{shipmentId}, all its activity logs, billing records, and any split child files linked to it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
          <Button 
            type="button" 
            variant="outline" 
            className="border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white" 
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            disabled={isPending} 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {isPending ? <Clock className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Confirm Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

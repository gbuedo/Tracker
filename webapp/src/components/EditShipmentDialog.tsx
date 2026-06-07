"use client";

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
import { updateShipment } from "@/actions/shipments";
import { useState, useEffect } from "react";
import { Edit2, Sparkles, Clipboard, Weight, Plane, Calendar, RefreshCw } from "lucide-react";
import { Shipment, Status } from "@/lib/types";
import { useRouter } from "next/navigation";

interface EditShipmentDialogProps {
  shipment: Shipment;
  statuses: Status[];
  customers: string[];
}

export function EditShipmentDialog({ shipment, statuses, customers }: EditShipmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form field state
  const [clientName, setClientName] = useState(shipment.client_name || "");
  const [reference, setReference] = useState(shipment.reference || "");
  const [shipmentType, setShipmentType] = useState(shipment.shipment_type || "Import");
  const [transportMode, setTransportMode] = useState(shipment.transport_mode || "Air");
  const [statusId, setStatusId] = useState(shipment.status_id?.toString() || "");
  const [pcs, setPcs] = useState(shipment.pcs?.toString() || "");
  const [kgs, setKgs] = useState(shipment.kgs?.toString() || "");
  const [chw, setChw] = useState(shipment.chw?.toString() || "");
  const [expoMawb, setExpoMawb] = useState(shipment.expo_mawb || "");
  const [expoHawb, setExpoHawb] = useState(shipment.expo_hawb || "");
  const [ctFile, setCtFile] = useState(shipment.ct_file || "");
  const [warehouseReceipt, setWarehouseReceipt] = useState(shipment.warehouse_receipt || "");
  const [aes, setAes] = useState(shipment.aes || "");
  const [etd, setEtd] = useState(shipment.etd || "");
  const [eta, setEta] = useState(shipment.eta || "");

  // Sync state if shipment prop changes
  useEffect(() => {
    setClientName(shipment.client_name || "");
    setReference(shipment.reference || "");
    setShipmentType(shipment.shipment_type || "Import");
    setTransportMode(shipment.transport_mode || "Air");
    setStatusId(shipment.status_id?.toString() || "");
    setPcs(shipment.pcs?.toString() || "");
    setKgs(shipment.kgs?.toString() || "");
    setChw(shipment.chw?.toString() || "");
    setExpoMawb(shipment.expo_mawb || "");
    setExpoHawb(shipment.expo_hawb || "");
    setCtFile(shipment.ct_file || "");
    setWarehouseReceipt(shipment.warehouse_receipt || "");
    setAes(shipment.aes || "");
    setEtd(shipment.etd || "");
    setEta(shipment.eta || "");
  }, [shipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateShipment(shipment.id, {
        client_name: clientName,
        reference: reference,
        shipment_type: shipmentType,
        transport_mode: transportMode || null,
        status_id: Number(statusId),
        pcs: pcs ? Number(pcs) : null,
        kgs: kgs ? Number(kgs) : null,
        chw: chw ? Number(chw) : null,
        expo_mawb: expoMawb || null,
        expo_hawb: expoHawb || null,
        ct_file: ctFile || null,
        warehouse_receipt: warehouseReceipt || null,
        aes: aes || null,
        etd: etd || null,
        eta: eta || null,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to update shipment:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[#121318] hover:bg-[#1a1c24] text-slate-300 hover:text-white border border-slate-800 rounded-xl h-10 px-4 text-xs font-bold" />}>
        <span className="flex items-center"><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit Shipment</span>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl md:max-w-6xl w-full bg-slate-950 border-slate-900 text-white max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl p-8">
        <DialogHeader className="border-b border-slate-900 pb-6">
          <DialogTitle className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-mono tracking-widest">
            <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
            EDIT FREIGHT FILE #{shipment.id}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Modify any operations parameter, reference airbill, scheduling date, or dimensions below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold text-slate-300">
            
            {/* Section 1: Core Operations */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl md:col-span-2">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Clipboard className="w-4 h-4" /> 1. Core Operations Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 grid gap-1.5">
                  <Label htmlFor="edit_client_name" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Client / Customer Profile</Label>
                  <div className="flex gap-2">
                    <select 
                      className="flex h-11 rounded-md border border-slate-800 bg-slate-900 text-slate-200 px-3 py-2 text-sm focus:border-sky-550 focus:outline-none"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    >
                      <option value="">-- Catalog --</option>
                      {customers.map((cust) => (
                        <option key={cust} value={cust}>{cust}</option>
                      ))}
                    </select>
                    <Input 
                      id="edit_client_name" 
                      required 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Or type custom client profile name..." 
                      className="flex-grow h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-660 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit_reference" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Client Reference / PO</Label>
                  <Input 
                    id="edit_reference" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-655 text-sm font-mono"
                    placeholder="e.g. PO-881293-AMZ" 
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit_shipment_type" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Operation Type</Label>
                  <select 
                    id="edit_shipment_type" 
                    value={shipmentType}
                    onChange={(e) => setShipmentType(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 text-sm focus:border-sky-550 focus:outline-none"
                  >
                    <option value="Quote">Quote</option>
                    <option value="Import">Import</option>
                    <option value="Export">Export</option>
                    <option value="Transit">Transit</option>
                    <option value="Combine">Combine</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit_transport_mode" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Transport Mode</Label>
                  <select 
                    id="edit_transport_mode" 
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 text-sm focus:border-sky-550 focus:outline-none"
                  >
                    <option value="Air">Air</option>
                    <option value="Ocean">Ocean</option>
                    <option value="Land">Land</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Combined">Combined</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit_status_id" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Milestone Status</Label>
                  <select 
                    id="edit_status_id" 
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 text-sm focus:border-sky-550 focus:outline-none"
                  >
                    {statuses.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Cargo metrics */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl col-span-1">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Weight className="w-4 h-4" /> 2. Cargo Parameters
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_pcs" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Pieces (PCS)</Label>
                  <Input 
                    id="edit_pcs" 
                    type="number"
                    value={pcs}
                    onChange={(e) => setPcs(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="0" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_kgs" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Gross KGS</Label>
                  <Input 
                    id="edit_kgs" 
                    type="number"
                    step="any"
                    value={kgs}
                    onChange={(e) => setKgs(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="0.0" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_chw" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Charge CHW</Label>
                  <Input 
                    id="edit_chw" 
                    type="number"
                    step="any"
                    value={chw}
                    onChange={(e) => setChw(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="0.0" 
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Time Scheduling */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl col-span-1">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Calendar className="w-4 h-4" /> 3. Schedule Timetable
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_etd" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Departure (ETD)</Label>
                  <Input 
                    id="edit_etd" 
                    type="date"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-200 font-mono text-sm" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_eta" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Arrival (ETA)</Label>
                  <Input 
                    id="edit_eta" 
                    type="date"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-200 font-mono text-sm" 
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Logistical Bills & References */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl md:col-span-2">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Plane className="w-4 h-4" /> 4. Logistics References & Airbills
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="edit_ct_file" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">CT File Ref</Label>
                  <Input 
                    id="edit_ct_file" 
                    value={ctFile}
                    onChange={(e) => setCtFile(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650 text-sm font-mono" 
                    placeholder="CT-9821" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="edit_warehouse_receipt" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Warehouse Rec.</Label>
                  <Input 
                    id="edit_warehouse_receipt" 
                    value={warehouseReceipt}
                    onChange={(e) => setWarehouseReceipt(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650 text-sm font-mono" 
                    placeholder="WH-44192" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="edit_aes" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">AES Filing Ref</Label>
                  <Input 
                    id="edit_aes" 
                    value={aes}
                    onChange={(e) => setAes(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="AES-X2026..." 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="edit_expo_mawb" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">MAWB Master bill</Label>
                  <Input 
                    id="edit_expo_mawb" 
                    value={expoMawb}
                    onChange={(e) => setExpoMawb(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="000-00000000" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="edit_expo_hawb" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">HAWB Housebill</Label>
                  <Input 
                    id="edit_expo_hawb" 
                    value={expoHawb}
                    onChange={(e) => setExpoHawb(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="HAWB-1002" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-900">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="bg-transparent border-slate-800 text-slate-400 hover:text-white rounded-xl h-11 px-5 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 px-6 text-sm">
              {isSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

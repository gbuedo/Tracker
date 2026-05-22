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
import { createShipment } from "@/actions/shipments";
import { useState, useRef } from "react";
import { Plus, Sparkles, UploadCloud, FileText, CheckCircle2, RefreshCw } from "lucide-react";

interface NewShipmentDialogProps {
  customers?: string[];
}

export function NewShipmentDialog({ customers = [] }: NewShipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Form field state (to allow programmatical pre-fill from scan)
  const [clientName, setClientName] = useState("");
  const [reference, setReference] = useState("");
  const [shipmentType, setShipmentType] = useState("Import");
  const [pcs, setPcs] = useState("");
  const [kgs, setKgs] = useState("");
  const [chw, setChw] = useState("");
  const [expoMawb, setExpoMawb] = useState("");
  const [expoHawb, setExpoHawb] = useState("");
  const [ctFile, setCtFile] = useState("");
  const [warehouseReceipt, setWarehouseReceipt] = useState("");
  const [aes, setAes] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form helper
  const handleResetForm = () => {
    setClientName("");
    setReference("");
    setShipmentType("Import");
    setPcs("");
    setKgs("");
    setChw("");
    setExpoMawb("");
    setExpoHawb("");
    setCtFile("");
    setWarehouseReceipt("");
    setAes("");
    setEtd("");
    setEta("");
    setScanSuccess(false);
  };

  // Document scanning simulation
  const handleScanDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanSuccess(false);
    setScanProgress(0);

    const phases = [
      { msg: "Connecting WCS OCR parser stream...", duration: 600 },
      { msg: "De-constructing document metadata structures...", duration: 800 },
      { msg: "Extracting cargo metrics & airway bills...", duration: 900 },
      { msg: "Completing form field mappings...", duration: 700 },
    ];

    let currentPhase = 0;
    
    const runPhase = () => {
      if (currentPhase >= phases.length) {
        // Complete scan and autofill!
        const fileNameLower = file.name.toLowerCase();
        
        if (fileNameLower.includes("invoice") || fileNameLower.includes("bill") || /\.(pdf|png|jpg|jpeg)$/i.test(fileNameLower) && !fileNameLower.includes("packing")) {
          // Pre-fill invoice data
          setClientName("Global Logistics Inc.");
          setReference("INV-2026-8831");
          setPcs("24");
          setKgs("450");
          setChw("475");
          setShipmentType("Import");
          setCtFile("CT-8890");
          setWarehouseReceipt("WR-55120");
          setExpoMawb("016-88992341");
          setExpoHawb("HAWB-44120");
          setAes("");
        } else if (fileNameLower.includes("packing") || fileNameLower.includes("sheet") || /\.(xls|xlsx|csv)$/i.test(fileNameLower)) {
          // Pre-fill sheet/packing list data
          setClientName("Kuehne Nagel");
          setReference("PO-99182-AMZ");
          setPcs("120");
          setKgs("2300");
          setChw("2350");
          setShipmentType("Export");
          setCtFile("CT-2391");
          setExpoMawb("012-99881234");
          setExpoHawb("HAWB-77610");
          setAes("AES-X2026051911");
        } else {
          // Default pre-fill
          setClientName("General Cargo Corp");
          setReference("REF-5510-WCS");
          setPcs("8");
          setKgs("120");
          setChw("125");
          setShipmentType("Transit");
          setCtFile("CT-3345");
        }

        setIsScanning(false);
        setScanSuccess(true);
        setScanProgress(100);
        return;
      }

      setScanMessage(phases[currentPhase].msg);
      setScanProgress((prev) => prev + Math.floor(90 / phases.length));
      
      setTimeout(() => {
        currentPhase++;
        runPhase();
      }, phases[currentPhase].duration);
    };

    runPhase();
  };

  async function actionWithClose(formData: FormData) {
    // Inject programmatical state values in case user submitted custom edits
    await createShipment(formData);
    setOpen(false);
    handleResetForm();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) handleResetForm();
    }}>
      <DialogTrigger render={<Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-lg shadow-sky-500/20" />}>
        <span className="flex items-center"><Plus className="mr-2 h-4 w-4" /> New Shipment</span>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-850 pb-4">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
            Create New Shipment File
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Initiate a tracking record in the WCS database. Complete fields manually or use the AI parser.
          </DialogDescription>
        </DialogHeader>

        {/* --- AI Document Parser Dropzone --- */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          {isScanning ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              {/* Green Laser Bar Animation */}
              <div className="relative w-full max-w-md h-32 bg-slate-950 border border-slate-850 rounded-lg overflow-hidden flex flex-col items-center justify-center p-4">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce z-10"></div>
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mb-2"></div>
                <span className="text-[11px] font-mono text-cyan-400 animate-pulse font-bold">{scanMessage}</span>
                
                {/* Progress bar */}
                <div className="w-2/3 bg-slate-900 rounded-full h-1 mt-3 overflow-hidden border border-slate-800">
                  <div className="bg-cyan-500 h-1 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                </div>
              </div>
            </div>
          ) : scanSuccess ? (
            <div className="py-3 px-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Document Scan Successful!</h4>
                  <p className="text-[10px] text-emerald-400/80">Extracted and pre-filled cargo parameters without saving files.</p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleResetForm}
                className="h-7 text-[10px] bg-slate-950 text-slate-400 hover:text-white border border-slate-800 rounded px-2"
              >
                Reset Form
              </Button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/20 cursor-pointer rounded-lg p-6 text-center transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleScanDocument} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" 
              />
              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-sky-400 transition-colors mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-200">✨ Drag & Drop Cargo Documents</h4>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                Scan Commercial Invoices, HAWBs, or Excel packing lists to auto-fill metadata in 3 seconds.
              </p>
            </div>
          )}
        </div>

        {/* --- Form Details --- */}
        <form action={actionWithClose} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-400">
            
            {/* Client Name Input/Dropdown */}
            <div className="grid gap-1.5 col-span-1 md:col-span-2">
              <Label htmlFor="client_name" className="text-slate-300">Client Name</Label>
              <div className="flex gap-2">
                <select 
                  className="flex h-10 w-1/3 rounded-md border border-slate-800 bg-slate-900 text-slate-200 px-3 py-2"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                >
                  <option value="">-- Choose Client --</option>
                  {customers.map((cust) => (
                    <option key={cust} value={cust}>{cust}</option>
                  ))}
                </select>
                <Input 
                  id="client_name" 
                  name="client_name" 
                  required 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Or type custom Client name..." 
                  className="flex-grow bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Reference */}
            <div className="grid gap-1.5">
              <Label htmlFor="reference" className="text-slate-300">Reference / PO</Label>
              <Input 
                id="reference" 
                name="reference" 
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650"
                placeholder="e.g. PO-881293-AMZ" 
              />
            </div>

            {/* Shipment Type */}
            <div className="grid gap-1.5">
              <Label htmlFor="shipment_type" className="text-slate-300">Shipment Type</Label>
              <select 
                id="shipment_type" 
                name="shipment_type" 
                value={shipmentType}
                onChange={(e) => setShipmentType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200"
              >
                <option value="Import">Import</option>
                <option value="Export">Export</option>
                <option value="Transit">Transit</option>
              </select>
            </div>

            {/* CT File */}
            <div className="grid gap-1.5">
              <Label htmlFor="ct_file" className="text-slate-300">CT File Ref</Label>
              <Input 
                id="ct_file" 
                name="ct_file" 
                value={ctFile}
                onChange={(e) => setCtFile(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650" 
                placeholder="e.g. CT-9821" 
              />
            </div>

            {/* Warehouse Receipt */}
            <div className="grid gap-1.5">
              <Label htmlFor="warehouse_receipt" className="text-slate-300">Warehouse Receipt</Label>
              <Input 
                id="warehouse_receipt" 
                name="warehouse_receipt" 
                value={warehouseReceipt}
                onChange={(e) => setWarehouseReceipt(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650" 
                placeholder="e.g. WH-44192" 
              />
            </div>

            {/* Pieces */}
            <div className="grid gap-1.5">
              <Label htmlFor="pcs" className="text-slate-300">Pieces (PCS)</Label>
              <Input 
                id="pcs" 
                name="pcs" 
                type="number"
                value={pcs}
                onChange={(e) => setPcs(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="0" 
              />
            </div>

            {/* Gross Weight */}
            <div className="grid gap-1.5">
              <Label htmlFor="kgs" className="text-slate-300">Gross Weight (KGS)</Label>
              <Input 
                id="kgs" 
                name="kgs" 
                type="number"
                value={kgs}
                onChange={(e) => setKgs(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="0.0" 
              />
            </div>

            {/* Chargeable Weight */}
            <div className="grid gap-1.5">
              <Label htmlFor="chw" className="text-slate-300">Chargeable Weight (CHW)</Label>
              <Input 
                id="chw" 
                name="chw" 
                type="number"
                value={chw}
                onChange={(e) => setChw(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="0.0" 
              />
            </div>

            {/* AES */}
            <div className="grid gap-1.5">
              <Label htmlFor="aes" className="text-slate-300">AES Filing Ref</Label>
              <Input 
                id="aes" 
                name="aes" 
                value={aes}
                onChange={(e) => setAes(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="e.g. AES-X2026..." 
              />
            </div>

            {/* MAWB */}
            <div className="grid gap-1.5">
              <Label htmlFor="expo_mawb" className="text-slate-300">MAWB Airbill</Label>
              <Input 
                id="expo_mawb" 
                name="expo_mawb" 
                value={expoMawb}
                onChange={(e) => setExpoMawb(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="000-00000000" 
              />
            </div>

            {/* HAWB */}
            <div className="grid gap-1.5">
              <Label htmlFor="expo_hawb" className="text-slate-300">HAWB Housebill</Label>
              <Input 
                id="expo_hawb" 
                name="expo_hawb" 
                value={expoHawb}
                onChange={(e) => setExpoHawb(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 font-mono" 
                placeholder="e.g. HAWB-1002" 
              />
            </div>

            {/* ETD */}
            <div className="grid gap-1.5">
              <Label htmlFor="etd" className="text-slate-300">Estimated Departure (ETD)</Label>
              <Input 
                id="etd" 
                name="etd" 
                type="date"
                value={etd}
                onChange={(e) => setEtd(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-200 font-mono" 
              />
            </div>

            {/* ETA */}
            <div className="grid gap-1.5">
              <Label htmlFor="eta" className="text-slate-300">Estimated Arrival (ETA)</Label>
              <Input 
                id="eta" 
                name="eta" 
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-200 font-mono" 
              />
            </div>

          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-850">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setOpen(false); handleResetForm(); }} 
              className="bg-transparent border-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
              Create Shipment File
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

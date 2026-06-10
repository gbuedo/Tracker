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
import { useState, useRef, useEffect } from "react";
import { Plus, Sparkles, UploadCloud, FileText, CheckCircle2, Calendar, Clipboard, Weight, Plane } from "lucide-react";

interface NewShipmentDialogProps {
  customers?: string[];
  statuses?: { id: number; name: string; color_code: string }[];
}

export function NewShipmentDialog({ customers = [], statuses = [] }: NewShipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Form field state (to allow programmatical pre-fill from scan)
  const [clientName, setClientName] = useState("");
  const [reference, setReference] = useState("");
  const [shipmentType, setShipmentType] = useState("Import");
  const [transportMode, setTransportMode] = useState("Air");
  const [statusId, setStatusId] = useState("");
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

  // Reset status ID to first milestone when dialog opens or statuses load
  useEffect(() => {
    if (statuses && statuses.length > 0 && !statusId) {
      const quoting = statuses.find(s => s.name.toLowerCase() === "quoting");
      setStatusId(quoting ? quoting.id.toString() : statuses[0].id.toString());
    }
  }, [statuses, open]);

  // Reset form helper
  const handleResetForm = () => {
    setClientName("");
    setReference("");
    setShipmentType("Import");
    setTransportMode("Air");
    const quoting = statuses.find(s => s.name.toLowerCase() === "quoting");
    setStatusId(quoting ? quoting.id.toString() : statuses[0]?.id?.toString() || "");
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
          setClientName("Global Logistics Inc.");
          setReference("INV-2026-8831");
          setPcs("24");
          setKgs("450");
          setChw("475");
          setShipmentType("Import");
          setTransportMode("Air");
          setCtFile("CT-8890");
          setWarehouseReceipt("WR-55120");
          setExpoMawb("016-88992341");
          setExpoHawb("HAWB-44120");
          setAes("");
          const quoted = statuses.find(s => s.name.toLowerCase() === "quoted" || s.name.toLowerCase() === "quoting");
          if (quoted) setStatusId(quoted.id.toString());
        } else if (fileNameLower.includes("packing") || fileNameLower.includes("sheet") || /\.(xls|xlsx|csv)$/i.test(fileNameLower)) {
          setClientName("Kuehne Nagel");
          setReference("PO-99182-AMZ");
          setPcs("120");
          setKgs("2300");
          setChw("2350");
          setShipmentType("Export");
          setTransportMode("Ocean");
          setCtFile("CT-2391");
          setExpoMawb("012-99881234");
          setExpoHawb("HAWB-77610");
          setAes("AES-X2026051911");
        } else {
          setClientName("General Cargo Corp");
          setReference("REF-5510-WCS");
          setPcs("8");
          setKgs("120");
          setChw("125");
          setShipmentType("Transit");
          setTransportMode("Land");
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
    await createShipment(formData);
    setOpen(false);
    handleResetForm();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) handleResetForm();
    }}>
      <DialogTrigger render={<Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-lg shadow-sky-500/20 rounded-xl" />}>
        <span className="flex items-center"><Plus className="mr-1.5 h-4 w-4" /> New Shipment</span>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full bg-slate-950 border-slate-900 text-white max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl p-8">
        <DialogHeader className="border-b border-slate-900 pb-6">
          <DialogTitle className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-mono tracking-widest">
            <Sparkles className="w-6 h-6 text-sky-400 animate-pulse" />
            CREATE NEW FREIGHT FILE
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Initiate a tracking record in the WCS database. Complete fields manually or use the AI parser.
          </DialogDescription>
        </DialogHeader>

        {/* --- AI Document Parser Dropzone --- */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          {isScanning ? (
            <div className="py-4 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-lg h-24 bg-slate-950 border border-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#22d3ee] animate-bounce z-10"></div>
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mb-1"></div>
                <span className="text-xs font-mono text-cyan-400 animate-pulse font-bold">{scanMessage}</span>
                <div className="w-2/3 bg-slate-900 rounded-full h-1 mt-2 overflow-hidden border border-slate-800">
                  <div className="bg-cyan-500 h-1 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                </div>
              </div>
            </div>
          ) : scanSuccess ? (
            <div className="py-3 px-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                <div>
                  <h4 className="text-sm font-bold text-white">AI Extraction Complete</h4>
                  <p className="text-xs text-emerald-400/80">Extracted and pre-filled cargo parameters.</p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleResetForm}
                className="h-8 text-xs bg-slate-950 text-slate-400 hover:text-white border border-slate-800 rounded px-3"
              >
                Reset Form
              </Button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-850 hover:border-sky-500/50 hover:bg-slate-900/20 cursor-pointer rounded-lg p-5 text-center transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleScanDocument} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" 
              />
              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-sky-400 transition-colors mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-slate-200">✨ Drag & Drop Cargo Documents</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Upload commercial invoices, airway bills, or Excel lists to parse instantly.
              </p>
            </div>
          )}
        </div>

        {/* --- Form Details --- */}
        <form action={actionWithClose} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold text-slate-300">
            
            {/* Section 1: Core Operations */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl md:col-span-2">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Clipboard className="w-4 h-4" /> 1. Core Operations Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 grid gap-1.5">
                  <Label htmlFor="client_name" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Client / Customer Profile</Label>
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
                      id="client_name" 
                      name="client_name" 
                      required 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Or type custom client profile name..." 
                      className="flex-grow h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="reference" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Client Reference / PO</Label>
                  <Input 
                    id="reference" 
                    name="reference" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650 text-sm font-mono"
                    placeholder="e.g. PO-881293-AMZ" 
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="shipment_type" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Operation Type</Label>
                  <select 
                    id="shipment_type" 
                    name="shipment_type" 
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
                  <Label htmlFor="transport_mode" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Transport Mode</Label>
                  <select 
                    id="transport_mode" 
                    name="transport_mode" 
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
                  <Label htmlFor="status_id" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Initial Milestone</Label>
                  <select 
                    id="status_id" 
                    name="status_id" 
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

            {/* Section 2: Load Metrics */}
            <div className="space-y-4 p-5 bg-slate-900/20 border border-slate-900 rounded-xl col-span-1">
              <h3 className="text-xs font-mono tracking-widest text-yellow-500 uppercase font-black flex items-center gap-1.5 pb-2.5 border-b border-slate-900">
                <Weight className="w-4 h-4" /> 2. Cargo Parameters
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="pcs" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Pieces (PCS)</Label>
                  <Input 
                    id="pcs" 
                    name="pcs" 
                    type="number"
                    value={pcs}
                    onChange={(e) => setPcs(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="0" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="kgs" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Gross KGS</Label>
                  <Input 
                    id="kgs" 
                    name="kgs" 
                    type="number"
                    step="any"
                    value={kgs}
                    onChange={(e) => setKgs(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="0.0" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="chw" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Charge CHW</Label>
                  <Input 
                    id="chw" 
                    name="chw" 
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
                  <Label htmlFor="etd" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Departure (ETD)</Label>
                  <Input 
                    id="etd" 
                    name="etd" 
                    type="date"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-200 font-mono text-sm" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="eta" className="text-slate-300 text-xs uppercase font-extrabold tracking-wider">Arrival (ETA)</Label>
                  <Input 
                    id="eta" 
                    name="eta" 
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
                  <Label htmlFor="ct_file" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">CT File Ref</Label>
                  <Input 
                    id="ct_file" 
                    name="ct_file" 
                    value={ctFile}
                    onChange={(e) => setCtFile(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650 text-sm font-mono" 
                    placeholder="CT-9821" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="warehouse_receipt" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">Warehouse Rec.</Label>
                  <Input 
                    id="warehouse_receipt" 
                    name="warehouse_receipt" 
                    value={warehouseReceipt}
                    onChange={(e) => setWarehouseReceipt(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-650 text-sm font-mono" 
                    placeholder="WH-44192" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="aes" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">AES Filing Ref</Label>
                  <Input 
                    id="aes" 
                    name="aes" 
                    value={aes}
                    onChange={(e) => setAes(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="AES-X2026..." 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="expo_mawb" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">MAWB Master bill</Label>
                  <Input 
                    id="expo_mawb" 
                    name="expo_mawb" 
                    value={expoMawb}
                    onChange={(e) => setExpoMawb(e.target.value)}
                    className="h-11 bg-slate-900 border-slate-800 text-slate-100 font-mono text-sm" 
                    placeholder="000-00000000" 
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-1">
                  <Label htmlFor="expo_hawb" className="text-slate-200 text-xs uppercase font-extrabold tracking-wider">HAWB Housebill</Label>
                  <Input 
                    id="expo_hawb" 
                    name="expo_hawb" 
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
              onClick={() => { setOpen(false); handleResetForm(); }} 
              className="bg-transparent border-slate-800 text-slate-400 hover:text-white rounded-xl h-11 px-5 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl h-11 px-6 text-sm">
              Create Shipment File
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

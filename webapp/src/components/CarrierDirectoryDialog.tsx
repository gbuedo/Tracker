"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCarrier, updateCarrier, deleteCarrier } from "@/actions/shipments";
import { 
  Search, Plus, Edit, Trash2, Phone, Mail, MapPin, 
  Notebook, Save, CheckCircle2, ChevronRight, BookOpen, AlertCircle
} from "lucide-react";
import { Carrier } from "@/lib/types";

interface CarrierDirectoryDialogProps {
  carriers: Carrier[];
}

export function CarrierDirectoryDialog({ carriers }: CarrierDirectoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState("");

  // Edit / Create Form States
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [handlingAgent, setHandlingAgent] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [firmsCode, setFirmsCode] = useState("");
  const [importFee, setImportFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [storage, setStorage] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCarrier = carriers.find(c => c.id === selectedCarrierId) || null;

  // Filtered Carriers
  const filteredCarriers = carriers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.handling_agent && c.handling_agent.toLowerCase().includes(q))
    );
  });

  const selectCarrier = (carrier: Carrier) => {
    setSelectedCarrierId(carrier.id);
    setIsEditing(false);
    setIsCreating(false);
    
    // Set form fields
    setCode(carrier.code);
    setName(carrier.name);
    setHandlingAgent(carrier.handling_agent || "");
    setPhone(carrier.phone || "");
    setEmail(carrier.email || "");
    setAddress(carrier.address || "");
    setFirmsCode(carrier.firms_code || "");
    setImportFee(carrier.import_fee ? String(carrier.import_fee) : "");
    setPaymentMethod(carrier.payment_method || "");
    setStorage(carrier.storage || "");
    setNotes(carrier.notes || "");
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedCarrierId(null);

    // Reset fields
    setCode("");
    setName("");
    setHandlingAgent("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFirmsCode("");
    setImportFee("");
    setPaymentMethod("");
    setStorage("");
    setNotes("");
  };

  const handleSave = () => {
    if (!code.trim() || !name.trim()) {
      alert("SCAC Code / Prefix and Carrier Name are required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          handling_agent: handlingAgent,
          phone,
          email,
          address,
          firms_code: firmsCode,
          import_fee: importFee,
          payment_method: paymentMethod,
          storage,
          notes
        };

        if (isCreating) {
          await addCarrier(code, name, payload);
          setStatusMsg("Carrier added successfully!");
          setIsCreating(false);
        } else if (selectedCarrierId) {
          await updateCarrier(selectedCarrierId, {
            code,
            name,
            ...payload
          });
          setStatusMsg("Carrier updated successfully!");
          setIsEditing(false);
        }

        setTimeout(() => setStatusMsg(""), 3000);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this carrier profile?")) return;

    startTransition(async () => {
      try {
        await deleteCarrier(id);
        setSelectedCarrierId(null);
        setStatusMsg("Carrier deleted.");
        setTimeout(() => setStatusMsg(""), 3000);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && carriers.length > 0 && !selectedCarrierId && !isCreating) {
        selectCarrier(carriers[0]);
      }
    }}>
      <DialogTrigger render={<Button className="h-10 bg-card border border-border text-foreground hover:text-[#8B4E43] rounded-xl shadow-sm hover:border-[#F0C5BC] hover:bg-[#FDF1EE] text-xs font-bold gap-2 px-4 shrink-0" />}>
        <Notebook className="w-4 h-4 text-[#E8A99A]" />
        Carriers Agenda
      </DialogTrigger>

      <DialogContent className="sm:max-w-6xl w-full bg-card border-border text-foreground rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="w-5 h-5 text-[#E8A99A]" />
            Carrier Contact Directory
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Manage contact information, firms codes, storage facilities, and handling agents for air and ocean carriers.
          </DialogDescription>
        </DialogHeader>

        {/* Master Detail Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4 flex-grow overflow-hidden min-h-[400px]">
          
          {/* LEFT COLUMN: CARRIERS LIST */}
          <div className="md:col-span-2 flex flex-col space-y-3 border-r border-slate-900 pr-4 overflow-hidden h-full">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search carriers by name or code..."
                className="pl-8 h-9 bg-slate-900/60 border-slate-800 text-slate-200 placeholder:text-slate-550 text-xs"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                Carriers Index ({filteredCarriers.length})
              </span>
              <Button 
                onClick={handleStartCreate}
                className="h-7 px-2.5 bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 text-sky-400 font-bold text-[10px] gap-1"
              >
                <Plus className="w-3 h-3" /> New Carrier
              </Button>
            </div>

            {/* Scrollable list */}
            <div className="flex-grow overflow-y-auto space-y-1 pr-1.5 scrollbar-thin">
              {filteredCarriers.length === 0 ? (
                <p className="text-center italic text-xs text-slate-600 py-8">No carriers match your filter</p>
              ) : (
                filteredCarriers.map(c => {
                  const isSelected = selectedCarrierId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectCarrier(c)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${
                        isSelected
                          ? "bg-slate-900 border-slate-700 text-white shadow-md"
                          : "bg-white dark:bg-slate-950/40 border-transparent hover:bg-slate-900/40 hover:border-slate-850 text-slate-400"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-950 text-yellow-600 dark:text-yellow-500/80 px-1 py-0.25 rounded border border-slate-900 font-bold text-[10px]">
                            {c.code}
                          </span>
                          <span className="font-bold truncate max-w-[150px]">{c.name}</span>
                        </div>
                        {c.handling_agent && (
                          <p className="text-[10px] text-slate-500 truncate pl-1">
                            Handling: {c.handling_agent}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "translate-x-0.5 text-yellow-500" : "text-slate-600"}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CARRIER DETAILS OR EDIT/CREATE FORM */}
          <div className="md:col-span-3 flex flex-col overflow-y-auto pr-1 h-full">
            
            {statusMsg && (
              <div className="mb-3 p-2 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 font-bold rounded-lg text-xs text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {statusMsg}
              </div>
            )}

            {!selectedCarrier && !isCreating ? (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-900 rounded-xl p-8">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs italic">Select a carrier from the index to view contact details, or create a new profile.</p>
              </div>
            ) : isEditing || isCreating ? (
              /* --- EDIT / CREATE FORM --- */
              <div className="space-y-4 text-xs font-semibold text-slate-300">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <h3 className="text-xs font-mono font-black text-yellow-500 uppercase tracking-widest">
                    {isCreating ? "Create Carrier Profile" : `Edit Profile: ${name}`}
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => isCreating ? setSelectedCarrierId(carriers[0]?.id || null) : setIsEditing(false)}
                      className="h-7 text-[10px] bg-slate-900 text-slate-400 hover:text-white"
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={isPending}
                      className="h-7 text-[10px] bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1"
                    >
                      <Save className="w-3 h-3" /> {isPending ? "Saving..." : "Save Carrier"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">SCAC / Code Prefix*</Label>
                    <Input 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                      placeholder="e.g. 001, MAEU"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9 font-mono"
                      required
                      disabled={isEditing} // Code prefix is immutable on edit
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Carrier / Airline Name*</Label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. American Airlines"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Handling Agent</Label>
                    <Input 
                      value={handlingAgent} 
                      onChange={(e) => setHandlingAgent(e.target.value)} 
                      placeholder="e.g. Alliance Ground"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Firms Code</Label>
                    <Input 
                      value={firmsCode} 
                      onChange={(e) => setFirmsCode(e.target.value)} 
                      placeholder="e.g. M706"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9 font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Contact Phone</Label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="e.g. 305-397-0170"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Contact Email</Label>
                    <Input 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="e.g. miaoffice@allianceground.com"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Import Fee</Label>
                    <Input 
                      value={importFee} 
                      onChange={(e) => setImportFee(e.target.value)} 
                      placeholder="e.g. 175"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Payment Method URL/Desc</Label>
                    <Input 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                      placeholder="e.g. www.pay.agi.aero"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5 col-span-2">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Storage Rates Description</Label>
                    <Input 
                      value={storage} 
                      onChange={(e) => setStorage(e.target.value)} 
                      placeholder="e.g. 24 hrs / $0.10 per kilo"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5 col-span-2">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Storage Warehouse Address</Label>
                    <Input 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="e.g. 1651 NW 68TH AVE, MIAMI FL 33122"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-805 text-slate-900 dark:text-slate-200 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5 col-span-2">
                    <Label className="text-slate-400 uppercase text-[10px] tracking-wider">Operational Notes</Label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="Any specific delivery instructions, airline schedules or rules..."
                      className="flex min-h-[70px] w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>
              </div>
            ) : selectedCarrier ? (
              /* --- STATIC DETAILS VIEW --- */
              <div className="space-y-5 flex-grow flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-[#0c0d12] border border-yellow-500/25 text-yellow-500 px-2 py-0.5 rounded font-black text-xs">
                        {selectedCarrier.code}
                      </span>
                      <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">
                        {selectedCarrier.name}
                      </h2>
                    </div>
                    {selectedCarrier.handling_agent && (
                      <p className="text-xs text-slate-400">
                        Miami Handling Agent: <span className="font-extrabold text-slate-250">{selectedCarrier.handling_agent}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      className="h-8 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 text-slate-350 text-xs gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button 
                      onClick={() => handleDelete(selectedCarrier.id)}
                      disabled={isPending}
                      variant="destructive"
                      className="h-8 px-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 hover:text-rose-350 text-xs gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-400 flex-grow">
                  
                  <div className="space-y-1 p-3 bg-[#0a0a0c] border border-slate-900 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1 font-bold">
                      <Phone className="w-3.5 h-3.5 text-yellow-500/70" /> Contact Phone
                    </span>
                    {selectedCarrier.phone ? (
                      <a href={`tel:${selectedCarrier.phone}`} className="text-slate-200 font-bold hover:text-yellow-500 font-mono text-sm block">
                        {selectedCarrier.phone}
                      </a>
                    ) : (
                      <span className="italic text-slate-600">No phone loaded</span>
                    )}
                  </div>

                  <div className="space-y-1 p-3 bg-[#0a0a0c] border border-slate-900 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1 font-bold">
                      <Mail className="w-3.5 h-3.5 text-yellow-500/70" /> Contact Email
                    </span>
                    {selectedCarrier.email ? (
                      <a href={`mailto:${selectedCarrier.email}`} className="text-slate-200 font-bold hover:text-yellow-500 font-mono text-xs block truncate" title={selectedCarrier.email}>
                        {selectedCarrier.email}
                      </a>
                    ) : (
                      <span className="italic text-slate-600">No email loaded</span>
                    )}
                  </div>

                  <div className="space-y-1 p-3 bg-[#0a0a0c] border border-slate-900 rounded-xl sm:col-span-2">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-yellow-500/70" /> Warehouse Address
                    </span>
                    {selectedCarrier.address ? (
                      <p className="text-slate-200 leading-relaxed">{selectedCarrier.address}</p>
                    ) : (
                      <span className="italic text-slate-600">No address loaded</span>
                    )}
                  </div>

                  {/* Financial & Logistics Info */}
                  <div className="p-4 bg-[#0a0a0c] border border-slate-900 rounded-xl sm:col-span-2 grid grid-cols-3 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-550 block font-bold">Firms Code</span>
                      <span className="font-mono text-slate-200 font-bold text-sm">{selectedCarrier.firms_code || "N/A"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-550 block font-bold">Import Fee</span>
                      <span className="font-mono text-emerald-400 font-black text-sm">
                        {selectedCarrier.import_fee ? `$${selectedCarrier.import_fee}` : "N/A"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-550 block font-bold">Payment Method</span>
                      <span className="text-slate-300 truncate block max-w-[130px]" title={selectedCarrier.payment_method || ""}>
                        {selectedCarrier.payment_method || "N/A"}
                      </span>
                    </div>
                  </div>

                  {selectedCarrier.storage && (
                    <div className="p-3 bg-[#0c0d12]/50 border border-slate-900 rounded-xl sm:col-span-2">
                      <span className="text-[8px] uppercase tracking-wider text-yellow-500 block font-extrabold mb-1">Storage terms</span>
                      <p className="text-slate-300 font-mono text-[11px] leading-tight">{selectedCarrier.storage}</p>
                    </div>
                  )}

                  {selectedCarrier.notes && (
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-900 rounded-xl sm:col-span-2">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 block font-bold mb-1">Delivery Notes & Comments</span>
                      <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{selectedCarrier.notes}</p>
                    </div>
                  )}

                </div>
              </div>
            ) : null}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

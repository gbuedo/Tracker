"use client";

import React, { useState, useRef } from "react";
import { OverseasAgent } from "@/lib/types";
import { saveOverseasAgentAction, deleteOverseasAgentAction } from "@/actions/shipments";
import { 
  Building2, User, MapPin, Phone, Mail, FileText, Plus, Trash2, Edit, Save, 
  Copy, Download, Check, Plane, Package, Container, ShieldAlert, Cpu, ArrowLeft,
  Sparkles, RefreshCw, Layers
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  initialAgents: OverseasAgent[];
}

export function ShippingInstructionsClient({ initialAgents }: Props) {
  const [agents, setAgents] = useState<OverseasAgent[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgents[0]?.id || "");
  
  // Customization Form States
  const [mawbShipperName, setMawbShipperName] = useState(initialAgents[0]?.name || "The agent who makes the shipment");
  const [mawbShipperAddress, setMawbShipperAddress] = useState(initialAgents[0]?.address || "");
  const [mawbShipperCity, setMawbShipperCity] = useState(initialAgents[0]?.city_country || "");
  const [mawbShipperContact, setMawbShipperContact] = useState(
    [initialAgents[0]?.phone, initialAgents[0]?.email].filter(Boolean).join(" · ") || ""
  );

  const [mawbConsigneeName, setMawbConsigneeName] = useState("WORLD CLASS SOLUTIONS");
  const [mawbConsigneeAddress, setMawbConsigneeAddress] = useState("8411 NW 74TH ST");
  const [mawbConsigneeCity, setMawbConsigneeCity] = useState("MIAMI, 33166 US");
  const [mawbConsigneePhone, setMawbConsigneePhone] = useState("TL: 305-530-8199");
  const [mawbConsigneeEmails, setMawbConsigneeEmails] = useState(
    "henderson@wcs-us.com\ngaston@wcs-us.com\noperations@wcs-us.com"
  );

  const [hawbShipper, setHawbShipper] = useState("Real Seller/Shipper");
  const [hawbConsignee, setHawbConsignee] = useState("Real consignee at final desti.");
  const [handlingInfo, setHandlingInfo] = useState('"Cargo in transit to... ++"');

  const [mawbNumber, setMawbNumber] = useState("MAWB # [Placeholder]");
  const [hawbNumber, setHawbNumber] = useState("HAWB # [Placeholder]");
  const [totalPieces, setTotalPieces] = useState("9");

  // Agent Modal / Edit State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<OverseasAgent> | null>(null);
  const [copiedTextSuccess, setCopiedTextSuccess] = useState(false);
  const [copiedImageSuccess, setCopiedImageSuccess] = useState(false);

  const graphicCardRef = useRef<HTMLDivElement>(null);

  // When selecting an agent from dropdown
  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    const found = agents.find(a => a.id === id);
    if (found) {
      setMawbShipperName(found.name);
      setMawbShipperAddress(found.address || "");
      setMawbShipperCity(found.city_country || "");
      const contacts = [found.phone, found.email].filter(Boolean).join(" · ");
      setMawbShipperContact(contacts);
    } else {
      setMawbShipperName("The agent who makes the shipment");
      setMawbShipperAddress("");
      setMawbShipperCity("");
      setMawbShipperContact("");
    }
  };

  // Save agent form
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent || !editingAgent.name) return;

    const saved = await saveOverseasAgentAction(editingAgent);
    const existingIndex = agents.findIndex(a => a.id === saved.id);
    if (existingIndex >= 0) {
      const updated = [...agents];
      updated[existingIndex] = saved;
      setAgents(updated);
    } else {
      setAgents([...agents, saved]);
    }
    handleSelectAgent(saved.id);
    setIsAgentModalOpen(false);
    setEditingAgent(null);
  };

  // Delete agent
  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this overseas agent from your directory?")) return;
    await deleteOverseasAgentAction(id);
    const remaining = agents.filter(a => a.id !== id);
    setAgents(remaining);
    if (remaining.length > 0) {
      handleSelectAgent(remaining[0].id);
    } else {
      handleSelectAgent("");
    }
  };

  // Copy WhatsApp Text
  const handleCopyWhatsAppText = () => {
    const text = `✈️ *AIR FREIGHT SHIPPING INSTRUCTIONS*

📋 *MASTER AIR WAYBILL (MAWB)*
*SHIPPER:* ${mawbShipperName}${mawbShipperAddress ? `\n${mawbShipperAddress}` : ''}${mawbShipperCity ? `\n${mawbShipperCity}` : ''}${mawbShipperContact ? `\n${mawbShipperContact}` : ''}

*CONSIGNEE:*
${mawbConsigneeName}
${mawbConsigneeAddress}
${mawbConsigneeCity}
${mawbConsigneePhone}
${mawbConsigneeEmails.split('\n').join('\n')}

📄 *HOUSE AIR WAYBILL (HAWB)*
*SHIPPER:* ${hawbShipper}
*CONSIGNEE:* ${hawbConsignee}

🏷️ *HANDLING INFORMATION*
${handlingInfo}

⚠️ *LABELING REQUIREMENTS:*
- EACH PIECE MUST BE UNIQUELY LABELED WITH BOTH MAWB & HAWB INFO
- LABEL ALL PIECES (e.g., 1/${totalPieces}, 2/${totalPieces}, ..., ${totalPieces}/${totalPieces})
- ENSURE MAWB AND HAWB DETAILS ARE CORRECTLY PAIRED ON EACH LABEL`;

    navigator.clipboard.writeText(text);
    setCopiedTextSuccess(true);
    setTimeout(() => setCopiedTextSuccess(false), 2500);
  };

  // Download / Copy PNG Image
  const handleDownloadImage = async () => {
    if (!graphicCardRef.current) return;
    try {
      const element = graphicCardRef.current;
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(element, { quality: 0.95, pixelRatio: 2 });
      
      const link = document.createElement("a");
      link.download = `Shipping_Instructions_${mawbShipperName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      setCopiedImageSuccess(true);
      setTimeout(() => setCopiedImageSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to export graphic card:", err);
      alert("Please take a screenshot or copy text while image generation finishes.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Top Header Navigation */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-1.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Return to Main Landing Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EBF3FB] border border-[#B8D5E5] flex items-center justify-center text-[#2B5B84]">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-foreground leading-none">Shipping Instructions Generator</h1>
                <p className="text-[11px] text-muted-foreground">Overseas Agent Directory & Air Freight Instructions Output</p>
              </div>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/operations" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
              Operations
            </Link>
            <Link href="/task-tracker" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
              Tasks
            </Link>
            <Link href="/ratesheet-tracker" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
              Ratesheets
            </Link>
            <span className="px-3 py-1.5 rounded-lg bg-[#2B5B84] text-white text-xs font-bold shadow-sm shadow-[#2B5B84]/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Shipping Instructions
            </span>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 flex-grow">
        
        {/* TOP TOOLBAR: AGENT SELECTION & QUICK ACTIONS */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <Label className="text-xs font-bold text-foreground whitespace-nowrap flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2B5B84]" />
              Overseas Agent:
            </Label>
            <select
              value={selectedAgentId}
              onChange={(e) => handleSelectAgent(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#2B5B84] w-full sm:w-[280px]"
            >
              <option value="">-- Custom / Manual Agent --</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.city_country ? `(${agent.city_country})` : ''}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingAgent({
                    name: "",
                    contact_person: "",
                    address: "",
                    city_country: "",
                    phone: "",
                    email: "",
                    notes: ""
                  });
                  setIsAgentModalOpen(true);
                }}
                className="text-xs gap-1 border border-border"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Add Agent
              </Button>

              {selectedAgentId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const found = agents.find(a => a.id === selectedAgentId);
                      if (found) {
                        setEditingAgent(found);
                        setIsAgentModalOpen(true);
                      }
                    }}
                    className="text-xs gap-1 border border-border"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-600" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAgent(selectedAgentId)}
                    className="text-xs gap-1 border border-border text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* EXPORT ACTION BUTTONS */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <Button
              onClick={handleCopyWhatsAppText}
              className="bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              {copiedTextSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTextSuccess ? "Copied to Clipboard!" : "Copy WhatsApp Text"}
            </Button>

            <Button
              onClick={handleDownloadImage}
              className="bg-[#2B5B84] hover:bg-[#1F4363] text-white text-xs font-bold gap-1.5 shadow-sm shadow-[#2B5B84]/30"
            >
              {copiedImageSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {copiedImageSuccess ? "Downloaded PNG!" : "Download Graphic PNG"}
            </Button>
          </div>

        </div>

        {/* MAIN 2-COLUMN DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: CUSTOMIZATION CONTROLS */}
          <div className="lg:col-span-4 space-y-5 bg-card border border-border p-5 rounded-xl shadow-sm">
            <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#2B5B84]" />
              Instruction Details Form
            </h2>

            {/* MAWB SHIPPER SECTION */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-[#2B5B84] uppercase tracking-wide">MAWB Shipper (Overseas Agent)</h3>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Agent Name</Label>
                <Input
                  value={mawbShipperName}
                  onChange={(e) => setMawbShipperName(e.target.value)}
                  placeholder="e.g. EUROPE EXPRESS CARGO GMBH"
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Street Address</Label>
                <Input
                  value={mawbShipperAddress}
                  onChange={(e) => setMawbShipperAddress(e.target.value)}
                  placeholder="e.g. Cargo City South, Bldg 534"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">City / Country / Zip</Label>
                <Input
                  value={mawbShipperCity}
                  onChange={(e) => setMawbShipperCity(e.target.value)}
                  placeholder="e.g. Frankfurt 60549, Germany"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Contact Phone / Email</Label>
                <Input
                  value={mawbShipperContact}
                  onChange={(e) => setMawbShipperContact(e.target.value)}
                  placeholder="e.g. +49 69 690 12345 · ops@agent.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* MAWB CONSIGNEE SECTION */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="text-[11px] font-bold text-[#2B5B84] uppercase tracking-wide">MAWB Consignee (Destination)</h3>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Company Name</Label>
                <Input
                  value={mawbConsigneeName}
                  onChange={(e) => setMawbConsigneeName(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Address & Phone</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={mawbConsigneeAddress} onChange={(e) => setMawbConsigneeAddress(e.target.value)} className="h-8 text-xs" />
                  <Input value={mawbConsigneePhone} onChange={(e) => setMawbConsigneePhone(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Notification Emails</Label>
                <textarea
                  value={mawbConsigneeEmails}
                  onChange={(e) => setMawbConsigneeEmails(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-input rounded-md p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* HAWB & HANDLING SECTION */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="text-[11px] font-bold text-[#2B5B84] uppercase tracking-wide">HAWB & Handling Information</h3>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">HAWB Shipper</Label>
                <Input value={hawbShipper} onChange={(e) => setHawbShipper(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">HAWB Consignee</Label>
                <Input value={hawbConsignee} onChange={(e) => setHawbConsignee(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Handling Info</Label>
                <Input value={handlingInfo} onChange={(e) => setHandlingInfo(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: GRAPHIC CARD OUTPUT PREVIEW */}
          <div className="lg:col-span-8 flex flex-col items-center justify-start space-y-4">
            
            <div className="w-full flex justify-between items-center text-xs text-muted-foreground font-semibold px-1">
              <span>AIR FREIGHT INSTRUCTION GRAPHIC PREVIEW</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Ready for Export
              </span>
            </div>

            {/* THE EXACT RECREATED GRAPHIC CARD matching reference image */}
            <div 
              ref={graphicCardRef}
              className="w-full bg-[#BFD9EB] p-4 md:p-6 rounded-2xl shadow-xl border-4 border-[#8EBBD9] text-[#0F2840] font-sans relative overflow-hidden select-none space-y-4"
              style={{ minWidth: "320px" }}
            >
              
              {/* HEADER BANNER */}
              <div className="bg-[#193F66] text-white py-3 px-4 rounded-xl text-center shadow-md relative flex items-center justify-between">
                <div className="flex items-center gap-2 opacity-30">
                  <Plane className="w-5 h-5 -rotate-45" />
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase font-sans">
                  AIR FREIGHT SHIPPING INSTRUCTIONS
                </h1>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-300" />
                  <Container className="w-5 h-5 text-cyan-300" />
                  <Plane className="w-5 h-5 text-sky-200 rotate-45" />
                </div>
              </div>

              {/* SECTION 1: MASTER AIR WAYBILL (MAWB) */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#9BBED9] space-y-2">
                <div className="inline-block bg-[#193F66] text-white text-xs md:text-sm font-extrabold uppercase px-3 py-1 rounded-md tracking-wider">
                  MASTER AIR WAYBILL (MAWB)
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  
                  {/* SHIPPER */}
                  <div className="md:col-span-6 space-y-1">
                    <span className="text-xs md:text-sm font-black text-[#193F66] uppercase tracking-wide block">SHIPPER:</span>
                    <div className="text-sm md:text-base font-bold leading-tight text-[#0F2840]">
                      <p>{mawbShipperName}</p>
                      {mawbShipperAddress && <p className="text-xs font-semibold text-slate-700">{mawbShipperAddress}</p>}
                      {mawbShipperCity && <p className="text-xs font-semibold text-slate-700">{mawbShipperCity}</p>}
                      {mawbShipperContact && <p className="text-xs font-mono font-semibold text-slate-600 pt-0.5">{mawbShipperContact}</p>}
                    </div>
                  </div>

                  {/* CONSIGNEE */}
                  <div className="md:col-span-6 space-y-1 md:border-l md:border-slate-200 md:pl-4">
                    <span className="text-xs md:text-sm font-black text-[#193F66] uppercase tracking-wide block">CONSIGNEE:</span>
                    <div className="text-xs md:text-sm font-bold text-[#0F2840] leading-snug">
                      <p className="text-sm md:text-base font-extrabold text-[#193F66]">{mawbConsigneeName}</p>
                      <p>{mawbConsigneeAddress}</p>
                      <p>{mawbConsigneeCity}</p>
                      <p className="font-mono text-slate-700 font-bold pt-0.5">{mawbConsigneePhone}</p>
                      <div className="font-mono text-[11px] text-slate-600 font-semibold pt-0.5 space-y-0.5">
                        {mawbConsigneeEmails.split('\n').filter(Boolean).map((email, idx) => (
                          <p key={idx}>{email.trim()}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 2: HAWB & HANDLING INFO + LABELING REQUIREMENTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* LEFT COL: HAWB & HANDLING INFO */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* HAWB BOX */}
                  <div className="bg-white rounded-xl p-3.5 shadow-sm border border-[#9BBED9] space-y-2">
                    <div className="inline-block bg-[#193F66] text-white text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                      HOUSE AIR WAYBILL (HAWB)
                    </div>
                    <div className="space-y-1.5 text-xs md:text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-[#193F66] uppercase min-w-[75px] shrink-0">SHIPPER:</span>
                        <span className="font-bold text-[#0F2840]">{hawbShipper}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-[#193F66] uppercase min-w-[75px] shrink-0">CONSIGNEE:</span>
                        <span className="font-bold text-[#0F2840]">{hawbConsignee}</span>
                      </div>
                    </div>
                  </div>

                  {/* HANDLING INFORMATION BOX */}
                  <div className="bg-white rounded-xl p-3.5 shadow-sm border border-[#9BBED9] text-center space-y-1">
                    <div className="text-xs md:text-sm font-black text-[#193F66] uppercase tracking-wider">
                      HANDLING INFORMATION
                    </div>
                    <div className="text-base md:text-lg font-black text-[#0F2840] tracking-wide">
                      {handlingInfo}
                    </div>
                  </div>

                </div>

                {/* RIGHT COL: AIR WAYBILL LABELING REQUIREMENTS DIAGRAM */}
                <div className="md:col-span-5 bg-[#D5E7F5] border-2 border-[#8EBBD9] rounded-xl p-3 shadow-sm space-y-2.5">
                  <div className="text-[11px] md:text-xs font-black text-[#193F66] uppercase tracking-wider text-center border-b border-[#A6C9E2] pb-1">
                    AIR WAYBILL LABELING REQUIREMENTS
                  </div>

                  <p className="text-[9px] md:text-[10px] font-bold text-[#193F66] leading-tight text-center">
                    • EACH PIECE MUST BE UNIQUELY LABELED WITH BOTH MAWB & HAWB INFO
                  </p>

                  {/* LABEL PIECES DIAGRAM MOCKUP */}
                  <div className="grid grid-cols-2 gap-1.5 bg-white p-1.5 rounded-lg border border-[#A6C9E2]">
                    
                    {/* PIECE 1/9 */}
                    <div className="border border-slate-300 rounded p-1 text-center bg-slate-50 space-y-0.5">
                      <div className="text-[7px] font-bold text-slate-500 uppercase leading-none">MASTER AIR WAYBILL (MAWB)</div>
                      <div className="text-[8px] font-mono font-bold text-slate-800 leading-none">{mawbNumber}</div>
                      <div className="text-[6px] text-slate-500 leading-none pt-0.5">SHIPPER: {mawbShipperName.slice(0, 15)}...</div>
                      <div className="text-[6px] text-slate-500 leading-none">CONSIGNEE: World Class Solutions</div>
                      <div className="text-base font-black text-[#193F66] py-0.5 leading-none">1/{totalPieces}</div>
                      <div className="text-[6px] font-bold text-slate-600 uppercase leading-none">PIECE NUMBER</div>
                    </div>

                    {/* PIECE 2/9 */}
                    <div className="border border-slate-300 rounded p-1 text-center bg-slate-50 space-y-0.5">
                      <div className="text-[7px] font-bold text-slate-500 uppercase leading-none">HOUSE AIR WAYBILL (HAWB)</div>
                      <div className="text-[8px] font-mono font-bold text-slate-800 leading-none">{hawbNumber}</div>
                      <div className="text-[6px] text-slate-500 leading-none pt-0.5">SHIPPER: {hawbShipper.slice(0, 15)}...</div>
                      <div className="text-[6px] text-slate-500 leading-none">CONSIGNEE: Final Destination</div>
                      <div className="text-base font-black text-[#193F66] py-0.5 leading-none">2/{totalPieces}</div>
                      <div className="text-[6px] font-bold text-slate-600 uppercase leading-none">PIECE NUMBER</div>
                    </div>

                  </div>

                  {/* BULLET REQUIREMENTS */}
                  <div className="space-y-1 text-[8px] md:text-[9px] font-bold text-[#193F66] leading-tight">
                    <p>• LABEL ALL PIECES (e.g., 1/{totalPieces}, 2/{totalPieces}, ..., {totalPieces}/{totalPieces})</p>
                    <p>• ENSURE MAWB AND HAWB DETAILS ARE CORRECTLY PAIRED ON EACH LABEL</p>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* AGENT MODAL (ADD / EDIT) */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2B5B84]" />
              {editingAgent?.id ? "Edit Overseas Agent Profile" : "Add New Overseas Agent"}
            </h2>

            <form onSubmit={handleSaveAgent} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Company / Agent Name *</Label>
                <Input
                  required
                  value={editingAgent?.name || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  placeholder="e.g. EUROPE EXPRESS CARGO GMBH"
                  className="text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  value={editingAgent?.contact_person || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, contact_person: e.target.value })}
                  placeholder="e.g. Hans Gruber"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  value={editingAgent?.address || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, address: e.target.value })}
                  placeholder="e.g. Cargo City South, Bldg 534"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">City & Country</Label>
                <Input
                  value={editingAgent?.city_country || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, city_country: e.target.value })}
                  placeholder="e.g. Frankfurt 60549, Germany"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    value={editingAgent?.phone || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                    placeholder="+49 69 12345"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    value={editingAgent?.email || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                    placeholder="ops@agent.de"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Operational Notes</Label>
                <Input
                  value={editingAgent?.notes || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, notes: e.target.value })}
                  placeholder="Primary agent for EU consolidations..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAgentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-[#2B5B84] hover:bg-[#1F4363] text-white">
                  Save Agent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 WCS Tracker · Shipping Instructions Middleware Online.</p>
      </footer>

    </div>
  );
}

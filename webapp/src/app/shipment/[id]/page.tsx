import * as db from "@/lib/db";
import { Shipment, Log } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddLogForm } from "@/components/AddLogForm";
import { EditableLogItem } from "@/components/EditableLogItem";
import { SplitCargoDialog } from "@/components/SplitCargoDialog";
import { StatusSelector } from "@/components/StatusSelector";
import { EmailQuoteParser } from "@/components/EmailQuoteParser";
import { DeleteShipmentButton } from "@/components/DeleteShipmentButton";
import { EditShipmentDialog } from "@/components/EditShipmentDialog";
import Link from "next/link";
import { ArrowLeft, Clock, Globe, Lock, Split, ArrowRight, ShieldAlert, Cpu, Circle, DollarSign, Tag, Plane, Ship, Truck, Activity, FileText } from "lucide-react";
import { format } from "date-fns";

export const revalidate = 0;

export default async function ShipmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipmentId = parseInt(id);

  // Fetch Shipment + Logs + Children (with automatic fallback to mock database)
  const shipment = await db.getShipmentById(shipmentId);
  const statuses = await db.getStatuses();
  const billableConcepts = await db.getBillableConcepts();
  const customers = await db.getCustomers();
  const isDemoMode = db.checkIsDemoMode();

  if (!shipment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">File Not Found</h2>
          <p className="text-slate-400 text-sm">
            The shipment you are looking for (File #{shipmentId}) could not be resolved in the database.
          </p>
          <Link href="/" className="inline-flex items-center text-sky-400 hover:text-white mt-4 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Operations Center
          </Link>
        </div>
      </div>
    );
  }

  const logs = shipment.logs?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

  // Calculate selling and cost totals from activity logs
  const sellingTotal = logs.reduce((sum, log) => sum + (log.amount && log.amount_type === 'selling' ? Number(log.amount) : 0), 0);
  const costTotal = logs.reduce((sum, log) => sum + (log.amount && log.amount_type !== 'selling' ? Number(log.amount) : 0), 0);
  const totalProfit = sellingTotal - costTotal;

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-yellow-500/30 selection:text-yellow-300">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center backdrop-blur-md sticky top-0 z-50 animate-fade-in">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-950"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              DEMO MODE ACTIVE: Database operating in local mock storage. All changes are stored locally.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6 flex-grow">
        
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors group text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Terminal Board
          </Link>
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            File Details Center
          </span>
        </div>
        
        {/* Shipment Banner Header (Airport Board Style) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0a0a0c] border-t-4 border-yellow-500 border-x border-b border-slate-900 p-6 rounded-xl relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black font-mono tracking-widest text-yellow-500 uppercase">
                FILE #{shipment.id}
              </h1>
              
              {shipment.shipment_type && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded border uppercase ${
                  shipment.shipment_type === 'Export' 
                    ? 'bg-sky-950/40 text-sky-400 border-sky-900/50' 
                    : shipment.shipment_type === 'Import'
                    ? 'bg-teal-950/40 text-teal-400 border-teal-900/50'
                    : shipment.shipment_type === 'Quote'
                    ? 'bg-yellow-950/40 text-yellow-500 border-yellow-900/50'
                    : shipment.shipment_type === 'Transit'
                    ? 'bg-amber-950/40 text-amber-500 border-amber-900/50'
                    : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50'
                }`}>
                  {shipment.shipment_type === 'Export' ? (
                    <Plane className="w-3 h-3" />
                  ) : shipment.shipment_type === 'Import' ? (
                    <Ship className="w-3 h-3" />
                  ) : shipment.shipment_type === 'Quote' ? (
                    <FileText className="w-3 h-3" />
                  ) : (
                    <Truck className="w-3 h-3" />
                  )}
                  {shipment.shipment_type}
                </span>
              )}

              {shipment.parent_shipment_id && (
                <Link 
                  href={`/shipment/${shipment.parent_shipment_id}`}
                  className="text-xs bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-900/50 px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1"
                >
                  <Split className="w-3 h-3" />
                  Sub-file of #{shipment.parent_shipment_id}
                </Link>
              )}
            </div>

            <p className="text-base text-slate-400">
              Client: <span className="text-white font-bold">{shipment.client_name}</span> 
              <span className="mx-2 text-slate-700">•</span> 
              Ref: <span className="text-indigo-400 font-mono font-medium">{shipment.reference || "N/A"}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-between border-t border-slate-800 md:border-none pt-4 md:pt-0">
            {/* Edit Shipment Details */}
            <EditShipmentDialog shipment={shipment} statuses={statuses} customers={customers} />

            {/* Status updates selector */}
            <StatusSelector shipmentId={shipment.id} currentStatusId={shipment.status_id} statuses={statuses} />

            {/* Split Cargo Dialog action */}
            <SplitCargoDialog 
              shipmentId={shipment.id} 
              parentPcs={shipment.pcs} 
              parentKgs={shipment.kgs} 
              parentChw={shipment.chw} 
            />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: SHIPMENT META DETAILS */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Operational Info Card */}
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md">
              <CardHeader className="border-b border-slate-800/60 pb-3">
                <CardTitle className="text-slate-200 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  Operational File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/60">
                  <div className="space-y-0.5">
                    <p className="text-slate-500 uppercase tracking-wider text-[10px]">Estimated Departure</p>
                    <p className="font-semibold text-slate-200 text-sm">{shipment.etd || "TBD"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-500 uppercase tracking-wider text-[10px]">Estimated Arrival</p>
                    <p className="font-semibold text-slate-200 text-sm">{shipment.eta || "TBD"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">CargoTrack File:</span>
                    <span className="font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
                      {shipment.ct_file || "Not Invoiced"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Warehouse Rec.:</span>
                    <span className="font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
                      {shipment.warehouse_receipt || "No Cargo Rec."}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">AES Filing Ref:</span>
                    <span className="font-mono text-slate-300">{shipment.aes || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">MAWB Airbill:</span>
                    <span className="font-mono text-slate-400 text-[11px]">{shipment.expo_mawb || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">HAWB Housebill:</span>
                    <span className="font-mono text-slate-400 text-[11px]">{shipment.expo_hawb || "N/A"}</span>
                  </div>
                </div>

                {/* Cargo Dimensions breakdown */}
                <div className="pt-4 border-t border-slate-800/60">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">Metrics & Load Weight</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-center space-y-0.5">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">PCS</p>
                      <p className="font-mono font-bold text-sky-400 text-sm">{shipment.pcs || "-"}</p>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-center space-y-0.5">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">KGS</p>
                      <p className="font-mono font-bold text-teal-400 text-sm">{shipment.kgs || "-"}</p>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-center space-y-0.5">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">CHW</p>
                      <p className="font-mono font-bold text-amber-500 text-sm">{shipment.chw || "-"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Split Shipments dropdown list */}
            {shipment.children && shipment.children.length > 0 && (
              <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md">
                <CardHeader className="pb-3 border-b border-slate-800/60">
                  <CardTitle className="text-slate-200 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <Split className="w-4 h-4 text-indigo-400" />
                    Split Sub-parts ({shipment.children.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {shipment.children.map(child => (
                      <li key={child.id}>
                        <Link 
                          href={`/shipment/${child.id}`} 
                          className="flex justify-between items-center p-2.5 bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800 rounded-lg transition-all text-xs group"
                        >
                          <span className="font-semibold text-slate-300 group-hover:text-indigo-400 transition-colors">
                            Sub-file #{child.id}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px] flex items-center gap-1 group-hover:text-slate-300">
                            {child.reference}
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Pre-invoicing summary box */}
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-slate-800/60 flex flex-row items-center justify-between">
                <CardTitle className="text-slate-200 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-sky-400" />
                  Pre-Invoicing Board
                </CardTitle>
                <div className="flex flex-col items-end text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Net Profit</span>
                  <span className={`font-extrabold font-mono text-sm ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    ${totalProfit.toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs font-semibold text-slate-450 space-y-3">
                {logs.filter(l => l.amount).length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-center italic py-2 text-slate-500">
                      No billing items logged on this shipment yet. Add billing details manually or parse an email quote.
                    </p>
                    <div className="flex justify-center pt-2">
                      <EmailQuoteParser shipment={shipment} billableConcepts={billableConcepts} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {logs.filter(l => l.amount).map(log => (
                        <div key={log.id} className="flex justify-between items-start py-1.5 border-b border-slate-800/40">
                          <div className="space-y-0.5">
                            <p className="text-slate-200 text-[11px] font-bold">
                              {log.billable_concept?.name || "Pre-Billing item"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {log.event_text}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono text-xs font-bold ${log.amount_type === 'selling' ? 'text-sky-400' : 'text-amber-500'}`}>
                              ${Number(log.amount).toFixed(2)}
                            </span>
                            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">
                              {log.amount_type === 'selling' ? 'Selling' : 'Cost'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-450">
                      <div className="flex justify-between items-center">
                        <span>Total Selling Owed:</span>
                        <span className="text-sky-400 font-mono font-bold">${sellingTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Cost Incurred:</span>
                        <span className="text-amber-500 font-mono font-bold">${costTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 font-extrabold text-xs text-white border-t border-slate-800">
                        <span>Net Profitability:</span>
                        <span className={totalProfit >= 0 ? 'text-emerald-450 font-mono' : 'text-rose-450 font-mono'}>
                          ${totalProfit.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-850 flex justify-center">
                      <EmailQuoteParser shipment={shipment} billableConcepts={billableConcepts} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Danger Zone Card */}
            <Card className="bg-rose-950/5 border-rose-950/30 backdrop-blur-md">
              <CardContent className="pt-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Danger Zone</p>
                  <p className="text-[9px] text-slate-500 font-semibold leading-tight">
                    Permanently delete this shipment and all linked logs.
                  </p>
                </div>
                <DeleteShipmentButton shipmentId={shipment.id} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: TIMELINE & FORM */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Timeline Activities Feed */}
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-md">
              <CardHeader className="border-b border-slate-800/60 pb-3">
                <CardTitle className="text-slate-200 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Live Operational Activity & Tracking Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                {/* Form to submit updates */}
                <AddLogForm shipmentId={shipment.id} billableConcepts={billableConcepts} />

                {/* Timeline graph */}
                <div className="space-y-6 relative border-l border-slate-800/80 ml-4 pl-6 pt-2">
                  {logs.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                      <Clock className="w-8 h-8 mx-auto text-slate-700 animate-spin mb-2" />
                      <p className="italic">No operational activities or client alerts registered.</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <EditableLogItem key={log.id} log={log} shipmentId={shipment.id} />
                    ))
                  )}
                </div>
                
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600">
        <p>© 2026 WCS Tracker. All systems operational.</p>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { searchPortalShipment } from "@/actions/shipments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Clock, ShieldCheck, ArrowLeft, ArrowUpRight, CheckCircle2, Calendar, MapPin, Layers, ShieldAlert, Cpu, X, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Portal() {
  const [search, setSearch] = useState("");
  const [shipment, setShipment] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setError("");
    setShipment(null);
    setLogs([]);

    try {
      const response = await searchPortalShipment(search);
      setIsDemoMode(response.isDemoMode);

      if (!response.result) {
        throw new Error("Shipment not found. Please verify your tracking reference.");
      }

      setShipment(response.result.shipment);
      setLogs(response.result.logs || []);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSearch("");
    setShipment(null);
    setLogs([]);
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-300">
      
      {/* ⚠️ DEMO MODE ACTIVE BANNER */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center backdrop-blur-md sticky top-0 z-50 animate-fade-in">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-950"></span>
            </div>
            <p className="text-xs md:text-sm font-semibold tracking-wide text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              PORTAL IN DEMO MODE: Supabase offline. Retrieving local high-fidelity cargo tracking simulation.
            </p>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md py-4 px-6 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/operations" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
            Operations Center
          </Link>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            Public Tracking Engine
          </span>
        </div>
      </header>

      {/* Main content body */}
      <div className="flex-grow flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden">
        {/* Glow lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-2xl w-full space-y-8 text-center relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-900/40 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              WCS Global Tracking
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              WCS Tracking Portal
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Access real-time milestones, active statuses, and transport timetables for imports, exports, and transit freights.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex space-x-2 max-w-lg mx-auto bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
            <div className="flex-grow relative flex items-center">
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enter cargo reference or File ID (e.g. PO-99281-AMZ)..."
                className="flex-grow h-12 text-sm bg-transparent border-none text-slate-200 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800/45 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all shrink-0" disabled={loading}>
              {loading ? <Clock className="animate-spin w-5 h-5" /> : <span className="flex items-center gap-1.5"><Search className="w-4 h-4" /> Track</span>}
            </Button>
          </form>

          {error && (
            <Card className="border-rose-900/30 bg-rose-950/20 text-rose-300 max-w-lg mx-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="p-4 flex items-center gap-3 text-xs font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {shipment && (
            <div className="text-left mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md shadow-2xl shadow-slate-950">
                <CardContent className="p-6 md:p-8 space-y-8">
                  
                  {/* File Header */}
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-850 pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                          <Package className="text-blue-500 w-6 h-6 shrink-0" />
                          Ref: {shipment.reference || "N/A"}
                        </h2>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleClear}
                          className="h-7 px-2.5 text-[10px] uppercase font-bold text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-900 border border-slate-800 rounded-md transition-colors"
                        >
                          Clear Search
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        File ID: {shipment.id} • {shipment.shipment_type || "Standard Freight"}
                      </p>
                    </div>
                    <div 
                      className="px-3.5 py-1.5 rounded-full text-xs font-extrabold border self-start md:self-auto uppercase tracking-wider"
                      style={{ 
                        backgroundColor: `${shipment.status?.color_code}15` || '#47556915',
                        borderColor: `${shipment.status?.color_code}40` || '#47556940',
                        color: shipment.status?.color_code || '#cbd5e1',
                        boxShadow: `0 0 10px ${shipment.status?.color_code}10`
                      }}
                    >
                      {shipment.status?.name || 'In Progress'}
                    </div>
                  </div>

                  {/* Summary grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-600" /> Loaded Pieces
                      </span>
                      <span className="font-bold text-slate-200 text-lg">{shipment.pcs || "TBD"} PCS</span>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Gross Weight
                      </span>
                      <span className="font-bold text-slate-200 text-lg">
                        {shipment.kgs ? `${shipment.kgs} KGS` : "TBD"}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" /> Estimated Arrival (ETA)
                      </span>
                      <span className="font-bold text-sky-400 text-sm">
                        {shipment.eta ? format(new Date(shipment.eta), 'MMM dd, yyyy') : "TBD"}
                      </span>
                    </div>
                  </div>

                  {/* Authorized Timeline Feed */}
                  <div className="space-y-5 pt-4 border-t border-slate-850">
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> Authorized Tracking Timeline
                    </h3>
                    
                    <div className="space-y-4 ml-3 border-l border-slate-850 pl-6 relative">
                      {logs.length === 0 ? (
                        <p className="text-slate-500 italic py-4 text-sm">No public tracking milestones published yet.</p>
                      ) : logs.map(log => (
                        <div key={log.id} className="relative group space-y-1">
                          {/* Dot indicator */}
                          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-950 absolute -left-[30px] top-1.5 shadow-sm shadow-blue-500/20"></div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-xs font-semibold text-slate-200 leading-relaxed max-w-md">
                                {log.event_text}
                              </span>
                              {log.amount && log.amount_type === 'selling' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-900/30 px-1.5 py-0.5 rounded leading-none">
                                  +${Number(log.amount).toFixed(2)}
                                </span>
                              )}
                              {log.amount && log.amount_type === 'cost' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-slate-500 bg-slate-900/40 border border-slate-800 px-1.5 py-0.5 rounded leading-none">
                                  <EyeOff className="w-2.5 h-2.5 text-slate-650" /> Price Private
                                </span>
                              )}
                            </div>
                            <time className="text-[10px] font-mono text-slate-500 whitespace-nowrap mt-0.5">
                              {format(new Date(log.created_at), 'MMM dd, yyyy • h:mm a')}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600">
        <p>© 2026 WCS Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Ship, Plane, Truck, Filter, ArrowUpRight, Calendar, 
  FileText, CheckCircle2, User, Settings, Sparkles, Plus, 
  ArrowUpDown, Check, RefreshCw, Layers, Warehouse, ChevronDown, ChevronUp, ExternalLink, Trash2, Download 
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shipment, Status } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addCustomer, addStatus, updateAppConfig, resetDatabase, seedDatabase, deleteShipment, deleteStatus } from "@/actions/shipments";

interface ShipmentsListProps {
  initialShipments: Shipment[];
  statuses: Status[];
  initialCustomers: string[];
  initialConfig: any;
}

export function ShipmentsList({ initialShipments, statuses, initialCustomers, initialConfig }: ShipmentsListProps) {
  const router = useRouter();

  // CSV backup exporter
  const exportToCSV = () => {
    const headers = [
      "File ID", "Parent File ID", "Client Name", "Reference", 
      "Type", "Mode", "Milestone Status", "Pieces", "Gross KGS", 
      "Chargeable CHW", "CT File", "Warehouse Receipt", "AES Ref", 
      "MAWB", "HAWB", "ETD", "ETA", "Created At"
    ];

    const rows = sortedShipments.map((ship) => [
      ship.id,
      ship.parent_shipment_id || "",
      `"${(ship.client_name || "").replace(/"/g, '""')}"`,
      `"${(ship.reference || "").replace(/"/g, '""')}"`,
      ship.shipment_type || "",
      ship.transport_mode || "",
      ship.status?.name || "In Progress",
      ship.pcs || "",
      ship.kgs || "",
      ship.chw || "",
      ship.ct_file || "",
      ship.warehouse_receipt || "",
      ship.aes || "",
      ship.expo_mawb || "",
      ship.expo_hawb || "",
      ship.etd || "",
      ship.eta || "",
      ship.created_at || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const miamiTime = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }).replace(/\//g, "-");
    link.setAttribute("download", `wcs_tracker_backup_${miamiTime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search & Type Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  
  // Multi-select Status Filter
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  // Sorting Priorities
  const [sortBy, setSortBy] = useState<string>("created_at"); // created_at | eta_asc | eta_desc | etd_asc | etd_desc
  const [groupBy, setGroupBy] = useState<string>("none"); // none | customer | type | status

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const toggleRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteShipment(id);
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getTransportIcon = (mode: string | null) => {
    const m = mode?.toLowerCase();
    if (m === "air") return <Plane className="w-3.5 h-3.5 text-sky-400" />;
    if (m === "ocean") return <Ship className="w-3.5 h-3.5 text-teal-400" />;
    if (m === "land") return <Truck className="w-3.5 h-3.5 text-amber-500" />;
    if (m === "warehouse" || m === "wh") return <Warehouse className="w-3.5 h-3.5 text-indigo-400" />;
    return <Layers className="w-3.5 h-3.5 text-slate-400" />; // Combined / other
  };

  // Unified Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#38bdf8"); // default sky-400
  const [nextAutonumeric, setNextAutonumeric] = useState(initialConfig?.next_shipment_id?.toString() || "");
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [wipingDb, setWipingDb] = useState(false);
  const [seedingDb, setSeedingDb] = useState(false);

  // Preset colors for new status tags
  const statusColors = [
    { name: "Sky Blue", hex: "#38bdf8" },
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Indigo", hex: "#6366f1" },
    { name: "Fuchsia", hex: "#d946ef" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Slate", hex: "#94a3b8" }
  ];

  // Helper to toggle selected status list
  const handleToggleStatus = (statusName: string) => {
    setSelectedStatuses(prev => 
      prev.includes(statusName) 
        ? prev.filter(name => name !== statusName) 
        : [...prev, statusName]
    );
  };

  const handleClearStatusFilters = () => {
    setSelectedStatuses([]);
  };

  // Filter shipments based on search, type, and multi-status selection
  const filteredShipments = useMemo(() => {
    return initialShipments.filter((ship) => {
      const matchesSearch = 
        ship.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (ship.reference && ship.reference.toLowerCase().includes(search.toLowerCase())) ||
        (ship.ct_file && ship.ct_file.toLowerCase().includes(search.toLowerCase())) ||
        (ship.expo_mawb && ship.expo_mawb.toLowerCase().includes(search.toLowerCase())) ||
        (ship.expo_hawb && ship.expo_hawb.toLowerCase().includes(search.toLowerCase())) ||
        (ship.aes && ship.aes.toLowerCase().includes(search.toLowerCase())) ||
        ship.id.toString().includes(search);

      const matchesType = typeFilter === "All" || ship.shipment_type === typeFilter;
      const matchesStatus = selectedStatuses.length === 0
        ? ship.status?.name !== "Closed"
        : selectedStatuses.includes(ship.status?.name || "");

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [initialShipments, search, typeFilter, selectedStatuses]);

  // Sort filtered shipments according to user sorting priority selection and group family splits
  const sortedShipments = useMemo(() => {
    const list = [...filteredShipments];
    
    // Identify root shipments and child split shipments
    const roots = list.filter(s => !s.parent_shipment_id);
    const children = list.filter(s => s.parent_shipment_id);
    
    const sortFn = (a: Shipment, b: Shipment) => {
      if (sortBy === "eta_asc") {
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      }
      if (sortBy === "eta_desc") {
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return new Date(b.eta).getTime() - new Date(a.eta).getTime();
      }
      if (sortBy === "etd_asc") {
        if (!a.etd) return 1;
        if (!b.etd) return -1;
        return new Date(a.etd).getTime() - new Date(b.etd).getTime();
      }
      if (sortBy === "etd_desc") {
        if (!a.etd) return 1;
        if (!b.etd) return -1;
        return new Date(b.etd).getTime() - new Date(a.etd).getTime();
      }
      // Default created_at desc (newest files first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    roots.sort(sortFn);

    // Assemble final list keeping parents and children together
    const resultList: Shipment[] = [];
    const placedChildrenIds = new Set<number>();

    roots.forEach(root => {
      resultList.push(root);
      const rootChildren = children.filter(c => c.parent_shipment_id === root.id);
      rootChildren.sort((a, b) => a.id - b.id);
      rootChildren.forEach(child => {
        resultList.push(child);
        placedChildrenIds.add(child.id);
      });
    });

    // Handle any orphan split shipments whose parent files are filtered out
    const orphans = children.filter(c => !placedChildrenIds.has(c.id));
    orphans.sort(sortFn);
    orphans.forEach(child => {
      resultList.push(child);
    });

    return resultList;
  }, [filteredShipments, sortBy]);

  // Group shipments if grouping is enabled
  const groupedShipmentsMap = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: Record<string, Shipment[]> = {};

    sortedShipments.forEach((ship) => {
      let key = "Other";
      if (groupBy === "customer") {
        key = ship.client_name || "Unknown Customer";
      } else if (groupBy === "type") {
        key = ship.shipment_type || "No Type";
      } else if (groupBy === "status") {
        key = ship.status?.name || "No Milestone";
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ship);
    });

    return groups;
  }, [sortedShipments, groupBy]);

  // Global Volume counts per status category
  const globalStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Populate all with 0 initially
    statuses.forEach(s => counts[s.name] = 0);
    // Count matches
    initialShipments.forEach(ship => {
      const name = ship.status?.name;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }, [initialShipments, statuses]);

  // Dynamic Type statistics
  const stats = useMemo(() => {
    const total = filteredShipments.length;
    const exports = filteredShipments.filter((s) => s.shipment_type === "Export").length;
    const imports = filteredShipments.filter((s) => s.shipment_type === "Import").length;
    const transits = filteredShipments.filter((s) => s.shipment_type === "Transit").length;
    
    return { total, exports, imports, transits };
  }, [filteredShipments]);

  // Configuration Panel Submissions
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccessMsg("");

    try {
      if (nextAutonumeric) {
        await updateAppConfig({ next_shipment_id: Number(nextAutonumeric) });
      }
      
      if (newCustomer.trim()) {
        await addCustomer(newCustomer.trim());
        setNewCustomer("");
      }

      if (newStatusName.trim()) {
        await addStatus(
          newStatusName.trim(),
          newStatusColor,
          statuses.length + 1
        );
        setNewStatusName("");
      }

      setSaveSuccessMsg("⚙️ Configurations saved successfully!");
      router.refresh();
      setTimeout(() => setSaveSuccessMsg(""), 3500);

    } catch (err: any) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetDatabase = async () => {
    setWipingDb(true);
    try {
      await resetDatabase();
      setSaveSuccessMsg("🗑️ Database successfully wiped and reset to scratch!");
      setNewCustomer("");
      setNewStatusName("");
      setShowConfirmReset(false);
      
      setTimeout(() => {
        setDialogOpen(false);
        setSaveSuccessMsg("");
      }, 2500);

      router.refresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setWipingDb(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeedingDb(true);
    try {
      await seedDatabase();
      setSaveSuccessMsg("🌱 Database successfully seeded with demo cargo!");
      setNewCustomer("");
      setNewStatusName("");
      setTimeout(() => {
        setDialogOpen(false);
        setSaveSuccessMsg("");
      }, 2500);
      router.refresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSeedingDb(false);
    }
  };


  return (
    <div className="space-y-6">

      {/* --- STATUS DYNAMIC CARDS ROW & VOLUME INDICATORS --- */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Operational Milestones Counters
          </h3>
          {selectedStatuses.length > 0 && (
            <Button 
              variant="ghost" 
              onClick={handleClearStatusFilters} 
              className="h-6 px-2 text-[10px] text-sky-400 hover:text-white uppercase font-bold"
            >
              Clear Filters ({selectedStatuses.length})
            </Button>
          )}
        </div>
        
        {/* Horizontal Status Pills Container - Wrapping Flexbar (No Scroll) */}
        <div className="flex flex-row flex-wrap gap-2 pb-2 max-w-full">
          {statuses.map((status) => {
            const count = globalStatusCounts[status.name] || 0;
            const isSelected = selectedStatuses.includes(status.name);
            return (
              <button
                key={status.id}
                onClick={() => handleToggleStatus(status.name)}
                className={`py-1 px-2.5 rounded-lg border flex items-center gap-2 transition-all duration-200 backdrop-blur-md relative overflow-hidden group shrink-0 h-[34px] ${
                  isSelected 
                    ? "bg-slate-900 border-slate-700 shadow-md ring-1 ring-sky-500/30"
                    : "bg-slate-900/30 border-slate-900/60 hover:border-slate-800/80 hover:bg-slate-900/50"
                }`}
              >
                {/* Visual Accent Dot */}
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ 
                    backgroundColor: status.color_code,
                    boxShadow: isSelected ? `0 0 6px ${status.color_code}` : "none"
                  }}
                />

                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-300 group-hover:text-white transition-colors truncate max-w-[110px]">
                  {status.name}
                </span>

                <span className="text-[10px] font-black font-mono text-white bg-slate-950/80 px-1.5 py-0.25 rounded border border-slate-850/60 ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SEARCH, SEARCH FILTER & ORDER OPTIONS BAR --- */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
        
        {/* Left Search input */}
        <div className="relative flex-grow max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Client, Reference, CT File, Airway Bill (MAWB/HAWB) or ID..."
            className="pl-10 h-11 bg-slate-950/80 border-slate-850 text-slate-200 placeholder:text-slate-500 focus-visible:ring-sky-500/50 focus-visible:border-sky-500/80 transition-all rounded-xl"
          />
        </div>

        {/* Filters and Config utilities */}
        <div className="flex flex-wrap gap-3 items-center justify-between xl:justify-end shrink-0">
          
          {/* Shipment Type filter */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850 gap-1 flex-wrap">
            {["All", "Quote", "Import", "Export", "Transit", "Combine"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  typeFilter === type
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Priority sorting select */}
          <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-850 text-xs font-semibold text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-xs font-bold text-slate-200"
            >
              <option value="created_at" className="bg-slate-950">Default (Date Created)</option>
              <option value="eta_asc" className="bg-slate-950">First ETA (Priorities Arrival)</option>
              <option value="eta_desc" className="bg-slate-950">Latest ETA (Arrival)</option>
              <option value="etd_asc" className="bg-slate-950">First ETD (Departing Priorities)</option>
              <option value="etd_desc" className="bg-slate-950">Latest ETD (Departing)</option>
            </select>
          </div>

          {/* Grouping select */}
          <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-850 text-xs font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-xs font-bold text-slate-200"
            >
              <option value="none" className="bg-slate-950">No Grouping (List)</option>
              <option value="customer" className="bg-slate-950">Group by Customer</option>
              <option value="type" className="bg-slate-950">Group by Operation Type</option>
              <option value="status" className="bg-slate-950">Group by Milestone Status</option>
            </select>
          </div>

          {/* --- CONFIGURATION GEAR DIALOG PANEL --- */}
          <Button 
            onClick={exportToCSV}
            className="h-10 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl shadow-lg hover:border-slate-700 hover:bg-slate-800/40 text-xs font-bold gap-1.5 px-3"
            title="Download CSV Backup"
          >
            <Download className="w-4.5 h-4.5 text-emerald-500" />
            Backup CSV
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="h-10 w-10 p-0 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl shadow-lg hover:border-slate-700 hover:bg-slate-800/40" />}>
              <Settings className="w-4 h-4" />
            </DialogTrigger>
            
            <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-50 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="border-b border-slate-850 pb-4">
                <DialogTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  <Settings className="w-5 h-5 text-sky-400 animate-spin" />
                  WCS Tracker Configurations
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Manage autonumeric index seeds, clients catalogs, and operational milestone tags.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveConfig} className="space-y-6 pt-4 text-xs font-bold text-slate-400">
                
                {/* Autonumeric seeding */}
                <div className="space-y-2">
                  <Label htmlFor="next_id" className="text-slate-300">Autonumeric shipment File ID seed</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="next_id"
                      type="number"
                      value={nextAutonumeric}
                      onChange={(e) => setNextAutonumeric(e.target.value)}
                      className="bg-slate-900 border-slate-800 font-mono text-slate-200"
                      placeholder="e.g. 1000"
                    />
                    <span className="text-[10px] text-slate-500 self-center">Current: {initialConfig?.next_shipment_id || 1}</span>
                  </div>
                </div>

                {/* Clients Catalogs */}
                <div className="space-y-2 border-t border-slate-850 pt-4">
                  <Label htmlFor="add_cust" className="text-slate-300">Add Customer Profile</Label>
                  <Input 
                    id="add_cust"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-200"
                    placeholder="e.g. Kuehne Nagel Logistics"
                  />
                  <div className="max-h-24 overflow-y-auto bg-slate-900/40 p-2 rounded border border-slate-900 text-[10px] font-mono font-semibold space-y-1 mt-1 text-slate-500">
                    <span className="block font-bold uppercase text-[9px] text-slate-600 mb-1">Registered Clients ({initialCustomers.length})</span>
                    {initialCustomers.map(c => <div key={c}>• {c}</div>)}
                  </div>
                </div>

                {/* Custom operational status creation */}
                <div className="space-y-3 border-t border-slate-850 pt-4">
                  <Label className="text-slate-300">Create New Milestone status tag</Label>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status_name" className="text-[10px] text-slate-500">Tag Name</Label>
                    <Input 
                      id="status_name"
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-200"
                      placeholder="e.g. Cleared Customs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500">Tag Color Accent</Label>
                    <div className="flex flex-wrap gap-2">
                      {statusColors.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewStatusColor(color.hex)}
                          className={`w-6 h-6 rounded-full border transition-all relative ${
                            newStatusColor === color.hex ? "border-white ring-1 ring-sky-500" : "border-slate-800"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {newStatusColor === color.hex && <Check className="w-3 h-3 text-slate-950 absolute inset-0 m-auto font-black" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-36 overflow-y-auto bg-slate-900/40 p-2 rounded border border-slate-900 text-[10px] font-mono font-semibold space-y-1.5 mt-2 text-slate-500">
                    <span className="block font-bold uppercase text-[9px] text-slate-650 mb-1">Registered Milestones ({statuses.length})</span>
                    {statuses.map(st => (
                      <div key={st.id} className="flex justify-between items-center py-0.5 border-b border-slate-900/30">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color_code }} />
                          <span className="text-slate-300">{st.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (confirm(`Are you sure you want to delete status milestone "${st.name}"?`)) {
                              await deleteStatus(st.id);
                              router.refresh();
                            }
                          }}
                          className="text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 p-1 rounded transition-colors"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Initial Setup/Seed */}
                <div className="space-y-3 border-t border-slate-850 pt-4">
                  <Label className="text-sky-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black">
                    🌱 Initial Demo Setup
                  </Label>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Populate your Supabase tables with sample parent/split shipments and tracking activity logs to test the terminal.
                  </p>
                  <Button 
                    type="button" 
                    onClick={handleSeedDatabase}
                    disabled={seedingDb || wipingDb}
                    className="w-full bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 text-sky-400 hover:text-sky-300 font-bold text-[11px] h-9 transition-all"
                  >
                    {seedingDb ? "Seeding Demo Data..." : "Seed Database with Demo Data"}
                  </Button>
                </div>

                {/* Danger Zone: reset database */}
                <div className="space-y-3 border-t border-rose-950/40 pt-4">
                  <Label className="text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black">
                    ⚠️ Danger Zone
                  </Label>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Permanently delete all shipment files, client logs, custom milestones, and start a fresh database.
                  </p>
                  
                  {!showConfirmReset ? (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => setShowConfirmReset(true)}
                      className="w-full bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-[11px] h-9 transition-all"
                    >
                      Wipe Database & Start Scratch
                    </Button>
                  ) : (
                    <div className="space-y-2 border border-rose-500/30 bg-rose-950/20 p-3 rounded-xl animate-pulse">
                      <p className="text-[9px] text-rose-300 font-extrabold uppercase tracking-wide text-center">
                        Are you sure? This deletes ALL operational data!
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowConfirmReset(false)}
                          className="flex-1 bg-transparent border-slate-800 text-slate-400 hover:text-white text-[10px] h-8"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleResetDatabase}
                          disabled={wipingDb}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] h-8"
                        >
                          {wipingDb ? "Wiping..." : "Yes, Wipe All"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 font-bold rounded-lg text-center animate-pulse">
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-end gap-2 border-t border-slate-850 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)} 
                    className="bg-transparent border-slate-800 text-slate-400"
                  >
                    Close
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                    disabled={savingSettings}
                  >
                    {savingSettings ? <RefreshCw className="animate-spin w-4 h-4" /> : "Save Configurations"}
                  </Button>
                </div>

              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* --- QUICK OPERATION STATS ROW --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between group hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Cargo Files</p>
            <p className="text-lg font-black text-white tracking-tight leading-none">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
            <Truck className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between group hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export Operations</p>
            <p className="text-lg font-black text-sky-400 tracking-tight leading-none">{stats.exports}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
            <Plane className="w-4 h-4 text-sky-400 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between group hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Import Operations</p>
            <p className="text-lg font-black text-teal-400 tracking-tight leading-none">{stats.imports}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
            <Ship className="w-4 h-4 text-teal-400" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between group hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transit Operations</p>
            <p className="text-lg font-black text-amber-500 tracking-tight leading-none">{stats.transits}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </div>
      {/* --- MAIN OPERATIONAL TERMINAL SHIPMENTS TABLE --- */}
      {(() => {
        const renderShipmentTable = (shipmentsList: Shipment[]) => {
          return (
            <Table>
              <TableHeader className="bg-[#0a0a0c] border-slate-900">
                <TableRow className="hover:bg-transparent border-slate-900">
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 max-w-[80px] whitespace-normal leading-tight">ID & Relations</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 max-w-[150px] whitespace-normal leading-tight">Client Name</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 max-w-[120px] whitespace-normal leading-tight hidden sm:table-cell">Reference / PO</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 max-w-[130px] whitespace-normal leading-tight hidden md:table-cell">Type & Mode</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 max-w-[120px] whitespace-normal leading-tight hidden sm:table-cell">ETD / ETA</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 text-right max-w-[100px] whitespace-normal leading-tight">Status</TableHead>
                  <TableHead className="text-yellow-500 font-mono font-bold text-[10px] uppercase tracking-wider py-1.5 text-center w-[80px]">Expand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentsList.length === 0 ? (
                  <TableRow className="border-slate-850 hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                      No shipments found in this group.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipmentsList.map((ship) => {
                    const isExpanded = !!expandedRows[ship.id];
                    return (
                      <div key={ship.id} style={{ display: 'contents' }}>
                        <TableRow
                          onClick={(e) => toggleRow(ship.id, e)}
                          className={`border-slate-900 hover:bg-slate-900/50 cursor-pointer transition-all duration-200 group text-slate-350 ${
                            ship.parent_shipment_id ? "bg-[#0b0c10]" : ""
                          }`}
                        >
                          <TableCell className="font-bold text-yellow-500 py-1.5 relative">
                            <div className="flex items-center space-x-1.5 font-mono">
                              {ship.parent_shipment_id && (
                                <span className="text-indigo-550 mr-0.5 text-[11px] font-black font-sans">↳</span>
                              )}
                              <span>{ship.id}</span>
                            </div>
                            {ship.parent_shipment_id && (
                              <span className="text-[8px] bg-indigo-950/70 text-indigo-350 border border-indigo-900/30 px-1 py-0.25 rounded font-mono block mt-0.5 w-max">
                                Sub of {ship.parent_shipment_id}
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="font-bold text-slate-100 group-hover:text-yellow-400 transition-colors truncate max-w-[120px] sm:max-w-[180px]">
                            {ship.client_name}
                          </TableCell>
                          
                          <TableCell className="text-slate-300 font-mono text-xs truncate max-w-[120px] hidden sm:table-cell">
                            {ship.reference || <span className="text-slate-655">-</span>}
                          </TableCell>
                          
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                                  ship.shipment_type === 'Export' 
                                    ? 'bg-sky-950/40 text-sky-400 border-sky-900/30' 
                                    : ship.shipment_type === 'Import'
                                    ? 'bg-teal-950/40 text-teal-400 border-teal-900/30'
                                    : ship.shipment_type === 'Quote'
                                    ? 'bg-yellow-950/40 text-yellow-500 border-yellow-900/30'
                                    : ship.shipment_type === 'Transit'
                                    ? 'bg-amber-950/40 text-amber-500 border-amber-900/30'
                                    : ship.shipment_type === 'Combine'
                                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'
                                    : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}>
                                {ship.shipment_type}
                              </span>
                              {ship.transport_mode && (
                                <span className="inline-flex items-center justify-center p-1 rounded-md bg-slate-950 border border-slate-900" title={ship.transport_mode}>
                                  {getTransportIcon(ship.transport_mode)}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-350 font-mono text-xs hidden sm:table-cell">
                            <div className="flex flex-col">
                              <span className="font-bold">{ship.etd || "-"}</span>
                              <span className="text-[10px] text-sky-400 font-bold">{ship.eta || "-"}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase font-sans"
                              style={{ 
                                backgroundColor: `${ship.status?.color_code}08` || '#47556908',
                                borderColor: `${ship.status?.color_code}25` || '#47556925',
                                color: ship.status?.color_code || '#cbd5e1'
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ship.status?.color_code || '#cbd5e1' }} />
                              {ship.status?.name || 'In Progress'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-center py-1.5">
                            <button
                              onClick={(e) => toggleRow(ship.id, e)}
                              className="p-1 rounded bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded details container */}
                        {isExpanded && (
                          <TableRow className="bg-[#040406]/60 border-slate-900 hover:bg-transparent">
                            <TableCell colSpan={7} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-400">
                                
                                {/* Airbills & Documentation */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bills & Documentation</h4>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    {ship.expo_mawb ? (
                                      <div>
                                        <span className="text-[9px] text-slate-500 uppercase font-black mr-1.5">MAWB Ref:</span>
                                        <span className="text-slate-200">{ship.expo_mawb}</span>
                                      </div>
                                    ) : null}
                                    {ship.expo_hawb ? (
                                      <div>
                                        <span className="text-[9px] text-slate-500 uppercase font-black mr-1.5">HAWB Ref:</span>
                                        <span className="text-slate-200">{ship.expo_hawb}</span>
                                      </div>
                                    ) : null}
                                    {ship.aes ? (
                                      <div>
                                        <span className="text-[9px] text-slate-500 uppercase font-black mr-1.5">AES Ref:</span>
                                        <span className="text-sky-400">{ship.aes}</span>
                                      </div>
                                    ) : null}
                                    {!ship.expo_mawb && !ship.expo_hawb && !ship.aes && (
                                      <span className="italic text-slate-605 text-[11px]">No bills loaded</span>
                                    )}
                                  </div>
                                </div>

                                {/* Tracking Files */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">File References</h4>
                                  <div className="space-y-1 font-mono">
                                    <div className="flex justify-between max-w-[180px]">
                                      <span className="text-slate-500">CT File:</span>
                                      <span className="font-mono text-slate-200 font-bold">{ship.ct_file || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between max-w-[180px]">
                                      <span className="text-slate-500">Warehouse Receipt:</span>
                                      <span className="font-mono text-slate-200 font-bold">{ship.warehouse_receipt || "N/A"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cargo metrics */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weight & Metrics</h4>
                                  <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                                    <div className="bg-slate-900 border border-slate-800 p-1.5 rounded">
                                      <div className="text-[8px] text-slate-550 uppercase">PCS</div>
                                      <div className="font-bold text-slate-200">{ship.pcs || "-"}</div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-1.5 rounded">
                                      <div className="text-[8px] text-slate-550 uppercase">KGS</div>
                                      <div className="font-bold text-teal-400">{ship.kgs || "-"}</div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-1.5 rounded">
                                      <div className="text-[8px] text-slate-550 uppercase">CHW</div>
                                      <div className="font-bold text-amber-500">{ship.chw || "-"}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Timetable dates & Direct link */}
                                <div className="space-y-1.5 flex flex-col justify-between">
                                  <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Dates</h4>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-slate-500 uppercase font-black w-7">ETD:</span>
                                        <span className="font-bold font-mono">{ship.etd || "TBD"}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-slate-500 uppercase font-black w-7">ETA:</span>
                                        <span className="font-bold font-mono text-sky-400">{ship.eta || "TBD"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 items-center w-full">
                                    <Link 
                                      href={`/shipment/${ship.id}`}
                                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-colors flex-grow text-[10px] uppercase tracking-wider shadow-sm truncate"
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      Manage Details
                                    </Link>

                                    {confirmDeleteId === ship.id ? (
                                      <div className="p-1 border border-rose-900/50 bg-rose-950/30 rounded-lg flex gap-1 items-center animate-in zoom-in-95 duration-155 shrink-0">
                                        <button
                                          onClick={(e) => handleDelete(ship.id, e)}
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold"
                                        >
                                          Del
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                          className="px-2 py-1 bg-slate-900 text-slate-450 rounded text-[8px] font-bold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ship.id); }}
                                        className="p-1.5 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-900/40 text-rose-450 hover:text-rose-350 font-bold rounded-lg transition-colors shrink-0"
                                        title="Delete Shipment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </div>
                    );
                  })
                )}
              </TableBody>
            </Table>
          );
        };

        if (groupBy === "none") {
          return (
            <div className="bg-black border border-slate-900 rounded-xl overflow-hidden shadow-2xl">
              {renderShipmentTable(sortedShipments)}
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {Object.entries(groupedShipmentsMap || {}).map(([groupName, groupShipments]) => (
              <div key={groupName} className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#0e0f12] border border-slate-900/60 px-4 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]"></span>
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-200">
                      {groupBy === "customer" ? `Client: ${groupName}` : groupBy === "type" ? `Type: ${groupName}` : `Milestone: ${groupName}`}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-yellow-500 border border-slate-850 rounded">
                    {groupShipments.length} Cargo Files
                  </span>
                </div>
                <div className="bg-black border border-slate-900 rounded-xl overflow-hidden shadow-lg">
                  {renderShipmentTable(groupShipments)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

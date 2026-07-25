"use client";

import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Ship, Plane, Truck, Filter, ArrowUpRight, Calendar, 
  FileText, CheckCircle2, User, Settings, Sparkles, Plus, 
  ArrowUpDown, Check, RefreshCw, Layers, Warehouse, ChevronDown, ChevronUp, ExternalLink, Trash2, Download,
  Mail, Phone, Flag
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shipment, Status, Carrier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { CarrierDirectoryDialog } from "@/components/CarrierDirectoryDialog";
import { Label } from "@/components/ui/label";
import { addCustomer, addStatus, updateAppConfig, deleteShipment, deleteStatus, addCarrier, deleteCarrier, getFullBackupData, importFullBackupAction, toggleShipmentFlag } from "@/actions/shipments";

interface ShipmentsListProps {
  initialShipments: Shipment[];
  statuses: Status[];
  initialCustomers: string[];
  initialCarriers?: Carrier[];
  initialConfig: any;
}

export function ShipmentsList({ initialShipments, statuses, initialCustomers, initialCarriers = [], initialConfig }: ShipmentsListProps) {
  const router = useRouter();

  const getHoursSinceLastUpdate = (ship: Shipment) => {
    const dates = [
      new Date(ship.created_at).getTime(),
      ship.updated_at ? new Date(ship.updated_at).getTime() : 0
    ];
    if (ship.logs && ship.logs.length > 0) {
      ship.logs.forEach(log => {
        if (log.created_at) {
          dates.push(new Date(log.created_at).getTime());
        }
      });
    }
    const maxTime = Math.max(...dates);
    return (Date.now() - maxTime) / (1000 * 60 * 60);
  };

  const formatDateTimeSmall = (val: string | null) => {
    if (!val) return "-";
    const parts = val.split("T");
    if (parts.length === 2) {
      return (
        <span className="flex items-center gap-1">
          <span>{parts[0]}</span>
          <span className="text-[10px] text-slate-500 font-normal">{parts[1]}</span>
        </span>
      );
    }
    return val;
  };

  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportFullBackup = async () => {
    setBackingUp(true);
    try {
      const data = await getFullBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const miamiTime = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }).replace(/\//g, "-");
      link.setAttribute("download", `wcs_tracker_full_backup_${miamiTime}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Backup failed to download.");
    } finally {
      setBackingUp(false);
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmImport = confirm("WARNING: Importing a backup will overwrite all current database tables (shipments, tasks, ratesheets, carrier agenda, status tags, configurations). Are you sure you want to proceed?");
    if (!confirmImport) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          await importFullBackupAction(json);
          alert("Backup successfully imported and database restored!");
          router.refresh();
        } catch (parseErr) {
          console.error(parseErr);
          alert("Invalid backup file format.");
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      alert("Failed to read backup file.");
      setImporting(false);
    }
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

  // Local configuration states for instant responsive updates
  const [statusesState, setStatusesState] = useState<Status[]>(statuses);
  const [carriersState, setCarriersState] = useState<Carrier[]>(initialCarriers);
  const [customersState, setCustomersState] = useState<string[]>(initialCustomers);
  const [newCarrierCode, setNewCarrierCode] = useState("");
  const [newCarrierName, setNewCarrierName] = useState("");

  useEffect(() => {
    setStatusesState(statuses);
  }, [statuses]);

  useEffect(() => {
    setCarriersState(initialCarriers);
  }, [initialCarriers]);

  useEffect(() => {
    setCustomersState(initialCustomers);
  }, [initialCustomers]);

  const getCarrierName = (mawb: string | null) => {
    if (!mawb) return "-";
    const cleanMawb = mawb.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // 1. Match 4-letter SCAC code
    const letterMatch = cleanMawb.match(/^[A-Z]{4}/);
    if (letterMatch) {
      const scac = letterMatch[0];
      const match = carriersState.find(c => c.code.toUpperCase() === scac);
      if (match) return match.name.toUpperCase();
    }
    
    // 2. Match 3-digit prefix
    const digitMatch = cleanMawb.match(/^[0-9]{3}/);
    if (digitMatch) {
      const prefix = digitMatch[0];
      const match = carriersState.find(c => c.code === prefix);
      if (match) return match.name.toUpperCase();
    }

    // 3. Match generic prefix match
    for (const carrier of carriersState) {
      if (cleanMawb.startsWith(carrier.code.toUpperCase())) {
        return carrier.name.toUpperCase();
      }
    }
    return "-";
  };

  const getCarrierObject = (mawb: string | null): Carrier | null => {
    if (!mawb) return null;
    const cleanMawb = mawb.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // 1. Match 4-letter SCAC code
    const letterMatch = cleanMawb.match(/^[A-Z]{4}/);
    if (letterMatch) {
      const scac = letterMatch[0];
      const match = carriersState.find(c => c.code.toUpperCase() === scac);
      if (match) return { ...match, name: match.name.toUpperCase() };
    }
    
    // 2. Match 3-digit prefix
    const digitMatch = cleanMawb.match(/^[0-9]{3}/);
    if (digitMatch) {
      const prefix = digitMatch[0];
      const match = carriersState.find(c => c.code === prefix);
      if (match) return { ...match, name: match.name.toUpperCase() };
    }

    // 3. Match generic prefix match
    for (const carrier of carriersState) {
      if (cleanMawb.startsWith(carrier.code.toUpperCase())) {
        return { ...carrier, name: carrier.name.toUpperCase() };
      }
    }
    return null;
  };

  const handleAddCustomer = async () => {
    const name = newCustomer.trim();
    if (!name) return;
    if (!customersState.includes(name)) {
      setCustomersState(prev => [...prev, name].sort());
    }
    setNewCustomer("");
    await addCustomer(name);
  };

  const handleAddStatus = async () => {
    const name = newStatusName.trim();
    if (!name) return;
    const color = newStatusColor;
    const nextSort = statusesState.length + 1;
    const tempId = Date.now();
    setStatusesState(prev => [...prev, { id: tempId, name, color_code: color, sort_order: nextSort }].sort((a, b) => a.sort_order - b.sort_order));
    setNewStatusName("");
    await addStatus(name, color, nextSort);
  };

  const handleDeleteStatus = async (id: number) => {
    if (confirm("Are you sure you want to delete this status milestone?")) {
      setStatusesState(prev => prev.filter(s => s.id !== id));
      await deleteStatus(id);
    }
  };

  const handleAddCarrier = async () => {
    const code = newCarrierCode.trim().toUpperCase();
    const name = newCarrierName.trim();
    if (!code || !name) return;
    const tempId = Date.now();
    setCarriersState(prev => [...prev, { id: tempId, code, name }].sort((a, b) => a.code.localeCompare(b.code)));
    setNewCarrierCode("");
    setNewCarrierName("");
    await addCarrier(code, name);
  };

  const handleDeleteCarrier = async (id: number) => {
    if (confirm("Are you sure you want to delete this carrier configuration?")) {
      setCarriersState(prev => prev.filter(c => c.id !== id));
      await deleteCarrier(id);
    }
  };

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
      if (sortBy === "update_hours_desc") {
        return getHoursSinceLastUpdate(b) - getHoursSinceLastUpdate(a);
      }
      if (sortBy === "update_hours_asc") {
        return getHoursSinceLastUpdate(a) - getHoursSinceLastUpdate(b);
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
    statusesState.forEach(s => counts[s.name] = 0);
    // Count matches
    initialShipments.forEach(ship => {
      const name = ship.status?.name;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }, [initialShipments, statusesState]);

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

    // Removed handleResetDatabase & handleSeedDatabase functions


  return (
    <div className="space-y-4">

      {/* --- STATUS DYNAMIC CARDS ROW & VOLUME INDICATORS --- */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            Operational Milestones Counters
          </h3>
          {selectedStatuses.length > 0 && (
            <Button 
              variant="ghost" 
              onClick={handleClearStatusFilters} 
              className="h-5 px-1.5 text-[9px] text-sky-400 hover:text-white uppercase font-bold"
            >
              Clear Filters ({selectedStatuses.length})
            </Button>
          )}
        </div>
        
        {/* Horizontal Status Pills Container - Wrapping Flexbar (No Scroll) */}
        <div className="flex flex-row flex-wrap gap-1.5 pb-1 max-w-full">
          {statusesState.map((status) => {
            const count = globalStatusCounts[status.name] || 0;
            const isSelected = selectedStatuses.includes(status.name);
            return (
              <button
                key={status.id}
                onClick={() => handleToggleStatus(status.name)}
                className={`py-0.5 px-2 rounded-lg border flex items-center gap-1.5 transition-all duration-200 relative overflow-hidden group shrink-0 h-[28px] ${
                  isSelected 
                    ? "bg-[#FDF1EE] border-[#F0C5BC] shadow-sm"
                    : "bg-card border-border hover:border-[#F0C5BC] hover:bg-[#FDF8F5]"
                }`}
              >
                {/* Visual Accent Dot */}
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: status.color_code }}
                />

                <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[100px]">
                  {status.name}
                </span>

                <span className="text-[9px] font-bold font-mono text-foreground bg-muted px-1 py-0.25 rounded border border-border ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SEARCH BAR & CARRIERS DIRECTORY BUTTON --- */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Client, Reference, CT File, Airway Bill (MAWB/HAWB) or ID..."
            className="pl-10 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#E8A99A]/60 focus-visible:border-[#E8A99A] transition-all rounded-xl w-full text-xs font-semibold"
          />
        </div>
        <CarrierDirectoryDialog carriers={carriersState} />
      </div>

      {/* --- CONTROLS & UTILITIES ROW (LINE 2) --- */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card border border-border p-2.5 rounded-xl">
        
        {/* Left: filters & selectors */}
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Shipment Type filter */}
          <div className="flex bg-muted p-0.5 rounded-lg border border-border gap-0.5 flex-wrap">
            {["All", "Quote", "Import", "Export", "Transit", "Combine"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
                  typeFilter === type
                    ? "bg-[#E8A99A] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Priority sorting select */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground h-8">
            <ArrowUpDown className="w-3 h-3" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-foreground"
            >
              <option value="created_at">Sort: Default (Created)</option>
              <option value="eta_asc">Sort: First ETA (Arrival)</option>
              <option value="eta_desc">Sort: Latest ETA (Arrival)</option>
              <option value="etd_asc">Sort: First ETD (Departure)</option>
              <option value="etd_desc">Sort: Latest ETD (Departure)</option>
              <option value="update_hours_desc">Sort: Longest Since Update</option>
              <option value="update_hours_asc">Sort: Most Recently Updated</option>
            </select>
          </div>

          {/* Grouping select */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground h-8">
            <Layers className="w-3 h-3" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-[10px] font-bold text-foreground"
            >
              <option value="none">Group: None (List)</option>
              <option value="customer">Group: Customer</option>
              <option value="type">Group: Type</option>
              <option value="status">Group: Status</option>
            </select>
          </div>
        </div>

        {/* Right: Backup JSON & Import Backup & Configuration gear */}
        <div className="flex items-center gap-2 justify-end">
          <Button 
            onClick={exportFullBackup}
            disabled={backingUp}
            className="h-8 bg-card border border-border text-muted-foreground hover:text-foreground rounded-lg shadow-sm hover:border-[#B0D4C8] hover:bg-[#EEF6F3] text-[10px] font-bold gap-1.5 px-3"
            title="Download Full Database Backup (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-[#7BB5A0]" />
            {backingUp ? "Backing up..." : "Backup Data"}
          </Button>

          <label className="h-8 bg-card border border-border text-muted-foreground hover:text-foreground rounded-lg shadow-sm hover:border-[#B0D0E8] hover:bg-[#EEF5FA] text-[10px] font-bold gap-1.5 px-3 flex items-center cursor-pointer justify-center select-none">
            <RefreshCw className={`w-3.5 h-3.5 text-[#8BBAD4] ${importing ? "animate-spin" : ""}`} />
            {importing ? "Importing..." : "Import Backup"}
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackupFile} 
              disabled={importing}
              className="hidden" 
            />
          </label>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="h-8 w-8 p-0 bg-card border border-border text-muted-foreground hover:text-foreground rounded-lg shadow-sm hover:border-[#F0C5BC] hover:bg-[#FDF1EE]" />}>
              <Settings className="w-3.5 h-3.5" />
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full bg-card border-border text-foreground max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl p-8">
              <DialogHeader className="border-b border-border pb-4">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Settings className="w-5 h-5 text-[#E8A99A]" />
                  WCS Tracker Configurations
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Manage autonumeric index seeds, clients catalogs, carrier databases, and operational milestone status tags.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveConfig} className="space-y-6 pt-4 text-xs font-semibold text-muted-foreground">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* --- LEFT COLUMN --- */}
                  <div className="space-y-6">
                    {/* Autonumeric seeding */}
                    <div className="space-y-2">
                      <Label htmlFor="next_id" className="text-muted-foreground uppercase tracking-wider text-[10px]">Autonumeric shipment File ID seed</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="next_id"
                          type="number"
                          value={nextAutonumeric}
                          onChange={(e) => setNextAutonumeric(e.target.value)}
                          className="bg-background border-border font-mono text-foreground"
                          placeholder="e.g. 1000"
                        />
                        <span className="text-[10px] text-muted-foreground self-center shrink-0">Current: {initialConfig?.next_shipment_id || 1}</span>
                      </div>
                    </div>

                    {/* Clients Catalogs */}
                    <div className="space-y-2 border-t border-border pt-4">
                      <Label htmlFor="add_cust" className="text-muted-foreground uppercase tracking-wider text-[10px]">Add Customer Profile</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="add_cust"
                          value={newCustomer}
                          onChange={(e) => setNewCustomer(e.target.value)}
                          className="bg-background border-border text-foreground"
                          placeholder="e.g. Kuehne Nagel Logistics"
                        />
                        <Button 
                          type="button"
                          onClick={handleAddCustomer}
                          className="bg-[#A89ACC] hover:bg-[#9080BA] text-white px-3 font-bold h-9"
                        >
                          Add
                        </Button>
                      </div>
                      
                      <div className="max-h-36 overflow-y-auto bg-muted p-3 rounded-xl border border-border text-[10px] font-mono font-semibold space-y-1 text-muted-foreground">
                        <span className="block font-bold uppercase text-[9px] mb-1">Registered Clients ({customersState.length})</span>
                        {customersState.map(c => (
                          <div key={c} className="py-0.5 border-b border-border/50 last:border-b-0">
                            • {c}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Removed Initial Demo Setup & Danger Zone */}
                  </div>

                  {/* --- RIGHT COLUMN --- */}
                  <div className="space-y-6">
                    {/* Milestone Status tags */}
                    <div className="space-y-3">
                      <Label className="text-muted-foreground uppercase tracking-wider text-[10px]">Create Custom Milestone Status Tag</Label>
                      
                      <div className="flex gap-2">
                        <Input 
                          id="status_name"
                          value={newStatusName}
                          onChange={(e) => setNewStatusName(e.target.value)}
                          className="bg-background border-border text-foreground"
                          placeholder="e.g. Cleared Customs"
                        />
                        <Button
                          type="button"
                          onClick={handleAddStatus}
                          className="bg-[#8BBAD4] hover:bg-[#6EA0BC] text-white px-3 font-bold h-9 shrink-0"
                        >
                          Add
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Color Accent Dot</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {statusColors.map((color) => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setNewStatusColor(color.hex)}
                              className={`w-5.5 h-5.5 rounded-full border transition-all relative ${
                                newStatusColor === color.hex ? "border-foreground ring-1 ring-[#E8A99A]" : "border-border"
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            >
                              {newStatusColor === color.hex && <Check className="w-2.5 h-2.5 text-white absolute inset-0 m-auto font-black" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto bg-muted p-3 rounded-xl border border-border text-[10px] font-mono font-semibold space-y-1.5 text-muted-foreground">
                        <span className="block font-bold uppercase text-[9px] mb-1">Registered Milestones ({statusesState.length})</span>
                        {statusesState.map(st => (
                          <div key={st.id} className="flex justify-between items-center py-0.5 border-b border-border/50 last:border-b-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color_code }} />
                              <span className="text-foreground">{st.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteStatus(st.id)}
                              className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Carrier Database Settings */}
                    <div className="space-y-3 border-t border-border pt-4">
                      <Label className="text-muted-foreground uppercase tracking-wider text-[10px]">Carrier Database Lookup (Air Prefix / Ocean SCAC)</Label>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={newCarrierCode}
                          onChange={(e) => setNewCarrierCode(e.target.value)}
                          placeholder="Code (E.g. 001, MAEU)"
                          className="bg-background border-border text-foreground text-xs col-span-1"
                        />
                        <Input
                          value={newCarrierName}
                          onChange={(e) => setNewCarrierName(e.target.value)}
                          placeholder="Carrier Name (E.g. Maersk)"
                          className="bg-background border-border text-foreground text-xs col-span-2"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleAddCarrier}
                          className="bg-[#7BB5A0] hover:bg-[#5E9E89] text-white text-xs font-bold h-8 px-4"
                        >
                          + Add Carrier
                        </Button>
                      </div>

                      <div className="max-h-36 overflow-y-auto bg-muted p-3 rounded-xl border border-border text-[10px] font-mono font-semibold space-y-1.5 text-muted-foreground">
                        <span className="block font-bold uppercase text-[9px] mb-1">Carrier Mapping Index ({carriersState.length})</span>
                        {carriersState.length === 0 ? (
                          <div className="italic text-center py-2">No Carrier profiles loaded.</div>
                        ) : (
                          carriersState.map(c => (
                            <div key={c.id} className="flex justify-between items-center py-0.5 border-b border-border/50 last:border-b-0">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#EEF5FA] text-[#3A6580] px-1 py-0.25 rounded border border-[#B0D0E8] font-bold shrink-0">{c.code}</span>
                                <span className="text-foreground truncate max-w-[170px]">{c.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteCarrier(c.id)}
                                className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"
                                title="Delete carrier mapping"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-[#EEF6F3] border border-[#B0D4C8] text-[#3D6E61] font-bold rounded-lg text-center">
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)} 
                    className="bg-transparent border-border text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#E8A99A] hover:bg-[#D4907F] text-white font-bold"
                    disabled={savingSettings}
                  >
                    {savingSettings ? <RefreshCw className="animate-spin w-4 h-4" /> : "Save Index Seed"}
                  </Button>
                </div>

              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>
      {/* --- QUICK OPERATION STATS ROW --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between hover:border-[#F0C5BC] hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtered Cargo Files</p>
            <p className="text-lg font-bold text-foreground tracking-tight leading-none">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#F2F0F8] flex items-center justify-center border border-[#C8C0E0]">
            <Truck className="w-4 h-4 text-[#A89ACC]" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between hover:border-[#B0D0E8] hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Export Operations</p>
            <p className="text-lg font-bold text-[#3A6580] tracking-tight leading-none">{stats.exports}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#EEF5FA] flex items-center justify-center border border-[#B0D0E8]">
            <Plane className="w-4 h-4 text-[#8BBAD4]" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between hover:border-[#B0D4C8] hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Import Operations</p>
            <p className="text-lg font-bold text-[#3D6E61] tracking-tight leading-none">{stats.imports}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#EEF6F3] flex items-center justify-center border border-[#B0D4C8]">
            <Ship className="w-4 h-4 text-[#7BB5A0]" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between hover:border-[#F0C5BC] hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transit Operations</p>
            <p className="text-lg font-bold text-[#8B4E43] tracking-tight leading-none">{stats.transits}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#FDF1EE] flex items-center justify-center border border-[#F0C5BC]">
            <CheckCircle2 className="w-4 h-4 text-[#E8A99A]" />
          </div>
        </div>
      </div>
      {/* --- MAIN OPERATIONAL TERMINAL SHIPMENTS TABLE --- */}
      {(() => {
        const renderShipmentTable = (shipmentsList: Shipment[]) => {
          return (
            <Table>
              <TableHeader className="bg-muted border-border">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[95px] whitespace-normal leading-tight">ID & Relations</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[150px] whitespace-normal leading-tight">Client Name</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[120px] whitespace-normal leading-tight hidden sm:table-cell">Reference / PO</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[130px] whitespace-normal leading-tight hidden md:table-cell">Type & Mode</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[100px] whitespace-normal leading-tight hidden md:table-cell">Carrier</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[120px] whitespace-normal leading-tight hidden sm:table-cell">ETD / ETA</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[100px] whitespace-normal leading-tight hidden sm:table-cell">Days to ETD/ETA</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 max-w-[100px] whitespace-normal leading-tight hidden sm:table-cell">Last Update</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 text-right max-w-[100px] whitespace-normal leading-tight">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider py-1.5 text-center w-[80px]">Expand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentsList.length === 0 ? (
                  <TableRow className="border-slate-850 hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500 font-medium">
                      No shipments found in this group.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipmentsList.map((ship) => {
                    const isExpanded = !!expandedRows[ship.id];
                    const isToday = (dateStr: string | null) => {
                      if (!dateStr) return false;
                      const onlyDate = dateStr.split("T")[0].split(" ")[0];
                      const miamiTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD in Miami
                      return onlyDate === miamiTodayStr;
                    };
                    const formatDaysDiff = (targetDateStr: string | null) => {
                      if (!targetDateStr) return "-";
                      const datePart = targetDateStr.split("T")[0].split(" ")[0];
                      const [tY, tM, tD] = datePart.split("-").map(Number);
                      const targetDate = new Date(tY, tM - 1, tD);
                      
                      const miamiDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
                      const [mY, mM, mD] = miamiDateStr.split("-").map(Number);
                      const nowDate = new Date(mY, mM - 1, mD);
                      
                      const diffTime = targetDate.getTime() - nowDate.getTime();
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays === 0) return "Today";
                      return diffDays > 0 ? `+${diffDays}d` : `${diffDays}d`;
                    };
                    const hasTodayEtaEtd = isToday(ship.eta) || isToday(ship.etd);
                    return (
                      <div key={ship.id} style={{ display: 'contents' }}>
                        <TableRow
                          onClick={(e) => toggleRow(ship.id, e)}
                          className={`border-border hover:bg-accent cursor-pointer transition-all duration-200 group ${
                            ship.parent_shipment_id 
                              ? "bg-muted/50" 
                              : ""
                          }`}
                        >
                          <TableCell className="font-bold text-[#8B4E43] py-1.5 relative">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await toggleShipmentFlag(ship.id);
                                  router.refresh();
                                }}
                                className="focus:outline-none shrink-0"
                                title={ship.is_flagged ? "Unflag Shipment" : "Flag Shipment"}
                              >
                                <Flag 
                                  className={`w-3.5 h-3.5 transition-transform active:scale-75 ${
                                    ship.is_flagged 
                                      ? "fill-rose-400 text-rose-400" 
                                      : "text-muted-foreground hover:text-foreground"
                                  }`} 
                                />
                              </button>
                              <div className="flex items-center space-x-1 font-mono">
                                {ship.parent_shipment_id && (
                                  <span className="text-[#A89ACC] mr-0.5 text-[11px] font-black font-sans">↳</span>
                                )}
                                <span>{ship.id}</span>
                              </div>
                            </div>
                            {ship.parent_shipment_id && (
                              <span className="text-[8px] bg-[#F2F0F8] text-[#5A4F7A] border border-[#C8C0E0] px-1 py-0.25 rounded font-mono block mt-0.5 w-max">
                                Sub of {ship.parent_shipment_id}
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="font-bold text-foreground group-hover:text-[#8B4E43] transition-colors truncate max-w-[120px] sm:max-w-[180px]">
                            {ship.client_name}
                          </TableCell>
                          
                          <TableCell className="text-slate-600 dark:text-slate-300 font-mono text-xs truncate max-w-[120px] hidden sm:table-cell">
                            {ship.reference || <span className="text-slate-400 dark:text-slate-655">-</span>}
                          </TableCell>
                          
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                                  ship.shipment_type === 'Export' 
                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30' 
                                    : ship.shipment_type === 'Import'
                                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-650 dark:text-teal-400 border-teal-200 dark:border-teal-900/30'
                                    : ship.shipment_type === 'Quote'
                                    ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/30'
                                    : ship.shipment_type === 'Transit'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900/30'
                                    : ship.shipment_type === 'Combine'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30'
                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}>
                                {ship.shipment_type}
                              </span>
                              {ship.transport_mode && (
                                <span className="inline-flex items-center justify-center p-1 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900" title={ship.transport_mode}>
                                  {getTransportIcon(ship.transport_mode)}
                                </span>
                              )}
                            </div>
                          </TableCell>
 
                          <TableCell className="text-muted-foreground font-sans text-xs hidden md:table-cell max-w-[100px] truncate">
                            {(() => {
                              const carrier = getCarrierObject(ship.expo_mawb);
                              if (carrier) {
                                return (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      onClick={(e) => e.stopPropagation()} 
                                      className="font-bold text-[#8B4E43] hover:text-[#C97A57] hover:underline cursor-pointer text-left outline-none shrink-0"
                                    >
                                      {carrier.name}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-64 bg-card border border-border text-foreground p-4 space-y-2.5 rounded-xl shadow-xl z-50">
                                      <div className="border-b border-border pb-2 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono bg-[#FDF1EE] text-[#8B4E43] px-1 py-0.25 rounded border border-[#F0C5BC] text-[9px] font-bold shrink-0">
                                            {carrier.code}
                                          </span>
                                          <span className="font-extrabold text-xs text-foreground truncate">{carrier.name}</span>
                                        </div>
                                        {carrier.handling_agent && (
                                          <p className="text-[10px] text-muted-foreground">Handling Agent: {carrier.handling_agent}</p>
                                        )}
                                      </div>
                                      
                                      <div className="space-y-2 text-[11px] font-semibold text-muted-foreground">
                                        {carrier.phone && (
                                          <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-[#7BB5A0] shrink-0" />
                                            <a href={`tel:${carrier.phone}`} className="text-foreground hover:text-[#8B4E43] font-mono">
                                              {carrier.phone}
                                            </a>
                                          </div>
                                        )}
                                        {carrier.email && (
                                          <div className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-[#8BBAD4] shrink-0" />
                                            <a href={`mailto:${carrier.email}`} className="text-foreground hover:text-[#8B4E43] font-mono truncate block max-w-[200px]" title={carrier.email}>
                                              {carrier.email}
                                            </a>
                                          </div>
                                        )}
                                        {carrier.firms_code && (
                                          <div className="text-[10px] font-mono text-muted-foreground">
                                            FIRMS Code: <span className="text-foreground font-bold">{carrier.firms_code}</span>
                                          </div>
                                        )}
                                        {carrier.address && (
                                          <p className="text-[10px] text-muted-foreground leading-snug pt-1.5 border-t border-border">
                                            {carrier.address}
                                          </p>
                                        )}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                );
                              }
                              return <span className="font-bold text-slate-500 dark:text-slate-400">{getCarrierName(ship.expo_mawb)}</span>;
                            })()}
                          </TableCell>
 
                          <TableCell className="text-muted-foreground font-sans text-xs hidden sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-foreground font-bold">{formatDateTimeSmall(ship.etd)}</span>
                                {isToday(ship.etd) && (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 dark:bg-slate-200 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-650 dark:bg-slate-200"></span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sky-600 dark:text-sky-400 font-bold">{formatDateTimeSmall(ship.eta)}</span>
                                {isToday(ship.eta) && (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-350 font-mono text-xs hidden sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-550 dark:text-slate-500 text-[11px] font-semibold">{formatDaysDiff(ship.etd)}</span>
                              <span className="text-sky-500 dark:text-sky-455 text-[11px] font-semibold">{formatDaysDiff(ship.eta)}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-slate-350 font-mono text-xs hidden sm:table-cell">
                            {(() => {
                              const hours = getHoursSinceLastUpdate(ship);
                              if (hours < 1) return <span className="text-emerald-400 font-extrabold animate-pulse">Just now</span>;
                              if (hours < 24) return <span className="text-emerald-455 font-bold">{Math.floor(hours)}h ago</span>;
                              const days = Math.floor(hours / 24);
                              if (days < 3) return <span className="text-slate-300 font-semibold">{days}d {Math.floor(hours % 24)}h ago</span>;
                              return <span className="text-slate-500">{days}d ago</span>;
                            })()}
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
                              className="p-1 rounded bg-muted border border-border hover:bg-accent hover:border-[#F0C5BC] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded details container */}
                        {isExpanded && (
                          <TableRow className="bg-[#FDFAF7] border-y border-border hover:bg-transparent">
                            <TableCell colSpan={10} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-muted-foreground">
                                                          {/* Airbills & Documentation */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bills & Documentation</h4>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    {ship.expo_mawb ? (
                                      <div>
                                        <span className="text-[9px] text-muted-foreground uppercase font-black mr-1.5">MAWB Ref:</span>
                                        <span className="text-foreground font-semibold">{ship.expo_mawb}</span>
                                      </div>
                                    ) : null}
                                    {ship.expo_hawb ? (
                                       <div className="flex flex-wrap items-center gap-1">
                                         <span className="text-[9px] text-muted-foreground uppercase font-black mr-1">HAWBs:</span>
                                         {ship.expo_hawb.split(/,\s*/).map((h, idx) => (
                                           <span key={idx} className="bg-muted border border-border text-foreground px-1 py-0.25 rounded text-[10px] uppercase font-bold">
                                             {h.trim()}
                                           </span>
                                         ))}
                                       </div>
                                     ) : null}
                                    {ship.aes ? (
                                      <div>
                                        <span className="text-[9px] text-muted-foreground uppercase font-black mr-1.5">AES Ref:</span>
                                        <span className="text-[#3A6580] font-semibold">{ship.aes}</span>
                                      </div>
                                    ) : null}
                                    {!ship.expo_mawb && !ship.expo_hawb && !ship.aes && (
                                      <span className="italic text-muted-foreground text-[11px]">No bills loaded</span>
                                    )}
                                  </div>
                                </div>

                                {/* Tracking Files */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">File References</h4>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between max-w-[180px]">
                                      <span className="text-muted-foreground">CT File:</span>
                                      <span className="font-mono text-foreground font-bold">{ship.ct_file || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between max-w-[180px]">
                                      <span className="text-muted-foreground">Warehouse Receipt:</span>
                                      <span className="font-mono text-foreground font-bold">{ship.warehouse_receipt || "N/A"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cargo metrics */}
                                <div className="space-y-1.5">
                                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Weight & Metrics</h4>
                                  <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                                    <div className="bg-card border border-border p-1.5 rounded">
                                      <div className="text-[8px] text-muted-foreground uppercase">PCS</div>
                                      <div className="font-bold text-foreground">{ship.pcs || "-"}</div>
                                    </div>
                                    <div className="bg-card border border-border p-1.5 rounded">
                                      <div className="text-[8px] text-muted-foreground uppercase">KGS</div>
                                      <div className="font-bold text-[#3D6E61]">{ship.kgs || "-"}</div>
                                    </div>
                                    <div className="bg-card border border-border p-1.5 rounded">
                                      <div className="text-[8px] text-muted-foreground uppercase">CHW</div>
                                      <div className="font-bold text-[#8B4E43]">{ship.chw || "-"}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Timetable dates & Direct link */}
                                <div className="space-y-1.5 flex flex-col justify-between">
                                  <div>
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estimated Dates</h4>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-muted-foreground uppercase font-black w-7">ETD:</span>
                                        <span className="font-bold font-mono text-foreground">{ship.etd || "TBD"}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-muted-foreground uppercase font-black w-7">ETA:</span>
                                        <span className="font-bold font-mono text-[#3A6580]">{ship.eta || "TBD"}</span>
                                      </div>
                                    </div>
                                  </div>
                                                             <div className="flex gap-2 items-center w-full">
                                     <Link 
                                      href={`/shipment/${ship.id}`}
                                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#8BBAD4] hover:bg-[#6EA0BC] text-white font-bold rounded-lg transition-colors flex-grow text-[10px] uppercase tracking-wider shadow-sm truncate"
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      Manage Details
                                    </Link>

                                    {confirmDeleteId === ship.id ? (
                                      <div className="p-1 border border-rose-200 bg-rose-50 rounded-lg flex gap-1 items-center animate-in zoom-in-95 duration-155 shrink-0">
                                        <button
                                          onClick={(e) => handleDelete(ship.id, e)}
                                          className="px-2 py-1 bg-rose-400 hover:bg-rose-500 text-white rounded text-[8px] font-bold"
                                        >
                                          Del
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                          className="px-2 py-1 bg-muted text-muted-foreground rounded text-[8px] font-bold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ship.id); }}
                                        className="p-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-500 font-bold rounded-lg transition-colors shrink-0"
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
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              {renderShipmentTable(sortedShipments)}
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {Object.entries(groupedShipmentsMap || {}).map(([groupName, groupShipments]) => (
              <div key={groupName} className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#FDF1EE] border border-[#F0C5BC] px-4 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8A99A]"></span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B4E43]">
                      {groupBy === "customer" ? `Client: ${groupName}` : groupBy === "type" ? `Type: ${groupName}` : `Milestone: ${groupName}`}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-card text-[#8B4E43] border border-[#F0C5BC] rounded">
                    {groupShipments.length} Cargo Files
                  </span>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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

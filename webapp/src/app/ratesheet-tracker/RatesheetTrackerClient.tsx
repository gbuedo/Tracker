"use client";

import { useState, useTransition, useMemo } from "react";
import { Ratesheet, RateConcept } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Search, Edit, Save, Copy, Check, Plus, Layers, 
  Trash2, Sliders, ChevronDown, BookOpen, Undo, AlertCircle
} from "lucide-react";
import { 
  updateRatesheetAction, duplicateRatesheetAction, applyMassMarkupAction, deleteRatesheetAction 
} from "@/actions/rates";

interface RatesheetTrackerClientProps {
  initialRatesheets: Ratesheet[];
}

export function RatesheetTrackerClient({ initialRatesheets }: RatesheetTrackerClientProps) {
  const [ratesheets, setRatesheets] = useState<Ratesheet[]>(initialRatesheets);
  const [selectedSheetId, setSelectedSheetId] = useState<number>(initialRatesheets[0]?.id || 1);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Selected Concepts for clipboard copy
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());

  // Form edit states
  const [editRates, setEditRates] = useState<Record<string, { rate: string; notes: string }>>({});

  // Mass Markup states
  const [markupType, setMarkupType] = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue] = useState("");
  const [markupCategory, setMarkupCategory] = useState<string>("all");

  // Save As Dialog states
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [initMarkupPercent, setInitMarkupPercent] = useState("");
  const [initMarkupFixed, setInitMarkupFixed] = useState("");

  const [isPending, startTransition] = useTransition();
  const [copySuccess, setCopySuccess] = useState(false);

  const selectedSheet = ratesheets.find(s => s.id === selectedSheetId) || ratesheets[0] || null;

  // Categories list based on current ratesheet
  const categories = useMemo(() => {
    if (!selectedSheet) return [];
    const cats = new Set<string>();
    selectedSheet.rates.forEach(r => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [selectedSheet]);

  // Filtered Rates Grouped by Category
  const filteredRatesGrouped = useMemo(() => {
    if (!selectedSheet) return {};
    const groups: Record<string, RateConcept[]> = {};
    
    selectedSheet.rates.forEach(r => {
      const q = search.toLowerCase();
      const matchesSearch = 
        r.name.toLowerCase().includes(q) || 
        r.notes.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q));

      if (matchesSearch) {
        const cat = r.category || "OTHER";
        if (!groups[cat]) {
          groups[cat] = [];
        }
        groups[cat].push(r);
      }
    });

    return groups;
  }, [selectedSheet, search]);

  const handleStartEdit = () => {
    if (!selectedSheet) return;
    setIsEditing(true);
    const initialEdits: Record<string, { rate: string; notes: string }> = {};
    selectedSheet.rates.forEach(r => {
      initialEdits[r.id] = { rate: r.rate, notes: r.notes };
    });
    setEditRates(initialEdits);
  };

  const handleRateInputChange = (id: string, field: 'rate' | 'notes', val: string) => {
    setEditRates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val
      }
    }));
  };

  const handleSaveChanges = () => {
    if (!selectedSheet) return;
    
    startTransition(async () => {
      const updatedRates = selectedSheet.rates.map(r => {
        const edit = editRates[r.id];
        if (edit) {
          return {
            ...r,
            rate: edit.rate,
            notes: edit.notes
          };
        }
        return r;
      });

      const updated = await updateRatesheetAction(selectedSheet.id, { rates: updatedRates });
      setRatesheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setIsEditing(false);
    });
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedConceptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectCategory = (catName: string, items: RateConcept[]) => {
    const allSelected = items.every(r => selectedConceptIds.has(r.id));
    setSelectedConceptIds(prev => {
      const next = new Set(prev);
      items.forEach(r => {
        if (allSelected) {
          next.delete(r.id);
        } else {
          next.add(r.id);
        }
      });
      return next;
    });
  };

  const handleCopySelected = () => {
    if (selectedConceptIds.size === 0 || !selectedSheet) return;

    const selectedList = selectedSheet.rates.filter(r => selectedConceptIds.has(r.id));
    
    // Format text professionally
    let formattedText = `WORLD CLASS SOLUTIONS - COMMERCIAL RATES\n`;
    formattedText += `Ratesheet: ${selectedSheet.name}\n`;
    formattedText += `---------------------------------------------------------\n`;

    // Group selected elements by category for clean print
    const categoriesMap: Record<string, RateConcept[]> = {};
    selectedList.forEach(r => {
      const cat = r.category || "OTHER";
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(r);
    });

    Object.entries(categoriesMap).forEach(([catName, list]) => {
      formattedText += `\n[Category: ${catName.toUpperCase()}]\n`;
      list.forEach(r => {
        formattedText += `• ${r.name}: ${r.rate}`;
        if (r.notes) formattedText += ` (${r.notes})`;
        formattedText += `\n`;
      });
    });
    
    formattedText += `\n---------------------------------------------------------\n`;
    formattedText += `Prices are subject to changes. Contact operations for booking.`;

    navigator.clipboard.writeText(formattedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleSaveAsClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !selectedSheet) return;

    startTransition(async () => {
      const pMarkup = initMarkupPercent ? parseFloat(initMarkupPercent) : 0;
      const fMarkup = initMarkupFixed ? parseFloat(initMarkupFixed) : 0;
      
      const sheetName = `${clientName.trim()} - Customized Rates`;
      
      const newSheet = await duplicateRatesheetAction(
        selectedSheet.id,
        sheetName,
        clientName.trim(),
        pMarkup,
        fMarkup
      );

      setRatesheets(prev => [...prev, newSheet]);
      setSelectedSheetId(newSheet.id);
      setSaveAsOpen(false);
      setClientName("");
      setInitMarkupPercent("");
      setInitMarkupFixed("");
    });
  };

  const handleApplyMassMarkup = () => {
    const val = parseFloat(markupValue);
    if (isNaN(val) || !selectedSheet) return;

    startTransition(async () => {
      const catFilter = markupCategory === "all" ? null : markupCategory;
      const updated = await applyMassMarkupAction(
        selectedSheet.id,
        markupType,
        val,
        catFilter
      );

      setRatesheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setMarkupValue("");
      alert(`Mass markup of ${val}${markupType === 'percent' ? '%' : ' USD'} applied successfully!`);
    });
  };

  const handleDeleteRatesheet = async () => {
    if (!selectedSheet || selectedSheet.client_name === null) return; // Base sheet cannot be deleted
    if (!confirm(`Are you sure you want to delete client ratesheet: "${selectedSheet.name}"?`)) return;

    startTransition(async () => {
      await deleteRatesheetAction(selectedSheet.id);
      setRatesheets(prev => prev.filter(s => s.id !== selectedSheet.id));
      setSelectedSheetId(initialRatesheets[0].id);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* CONTROLS MASTER HUB PANEL */}
      <div className="bg-[#0a0a0c] border border-slate-900 rounded-2xl p-4 md:p-6 space-y-6 shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4">
          {/* Ratesheet dropdown selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 font-mono">Catalog:</span>
            <select
              value={selectedSheetId}
              onChange={(e) => {
                setSelectedSheetId(Number(e.target.value));
                setIsEditing(false);
                setSelectedConceptIds(new Set());
              }}
              className="bg-slate-950 text-emerald-400 border border-slate-850 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500/30"
              disabled={isEditing}
            >
              {ratesheets.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">
                  {s.name} {s.client_name ? `(${s.client_name})` : " (MASTER BASE)"}
                </option>
              ))}
            </select>
            
            {/* Delete Client ratesheet button */}
            {selectedSheet && selectedSheet.client_name !== null && (
              <Button 
                onClick={handleDeleteRatesheet}
                disabled={isPending || isEditing}
                className="h-8 w-8 p-0 bg-rose-950/20 hover:bg-rose-955/35 border border-rose-900/30 text-rose-500 rounded-lg"
                title="Delete this client ratesheet"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save As... Button */}
            {selectedSheet && (
              <Dialog open={saveAsOpen} onOpenChange={(v) => { setSaveAsOpen(v); if(!v) { setClientName(""); setInitMarkupPercent(""); setInitMarkupFixed(""); } }}>
                <DialogTrigger render={<Button className="h-9 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold gap-1.5 px-3.5 shrink-0" />}>
                  <Plus className="w-3.5 h-3.5" /> Save As... (Client Sheet)
                </DialogTrigger>
                <DialogContent className="sm:max-w-md w-full bg-slate-950 border-slate-900 text-slate-100 rounded-2xl shadow-2xl p-6">
                  <DialogHeader className="border-b border-slate-850 pb-4">
                    <DialogTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-mono">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      Save As Client Ratesheet
                    </DialogTitle>
                    <DialogDescription className="text-slate-450 text-xs">
                      Duplicate the base ratesheet for a specific client profile and apply an optional markup adjustment.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSaveAsClient} className="space-y-4 pt-4 text-xs font-semibold text-slate-300">
                    <div className="grid gap-1.5">
                      <Label htmlFor="client_profile" className="text-slate-200 uppercase text-[10px] tracking-wider">Client Name*</Label>
                      <Input 
                        id="client_profile"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Kuehne Nagel Logistics"
                        className="bg-slate-900 border-slate-800 text-slate-100 h-10 text-xs font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="p_markup" className="text-slate-400 uppercase text-[10px] tracking-wider">Add Percentage Markup (%)</Label>
                        <Input 
                          id="p_markup"
                          type="number"
                          step="any"
                          value={initMarkupPercent}
                          onChange={(e) => setInitMarkupPercent(e.target.value)}
                          placeholder="e.g. 10 for +10%"
                          className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="f_markup" className="text-slate-400 uppercase text-[10px] tracking-wider">Add Fixed Markup ($)</Label>
                        <Input 
                          id="f_markup"
                          type="number"
                          step="any"
                          value={initMarkupFixed}
                          onChange={(e) => setInitMarkupFixed(e.target.value)}
                          placeholder="e.g. 5 for +$5.00"
                          className="bg-slate-900 border-slate-800 text-slate-200 h-10 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSaveAsOpen(false)}
                        className="bg-transparent border-slate-800 text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Create Parallel Sheet
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Toggler */}
            {selectedSheet && (
              isEditing ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="outline" 
                    className="h-9 border-slate-800 text-slate-400 hover:text-white text-xs px-3"
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveChanges} 
                    className="h-9 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-4"
                    disabled={isPending}
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleStartEdit} 
                  className="h-9 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold gap-1.5 px-4"
                >
                  <Edit className="w-3.5 h-3.5 text-yellow-500" /> Edit Rates
                </Button>
              )
            )}
          </div>
        </div>

        {/* BOTTOM HEADER ROW: SEARCH AND MASS MARKUP (ONLY FOR CLIENT SHEETS) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concepts or notes..."
              className="pl-9 h-10 bg-slate-950/60 border-slate-850 text-slate-200 placeholder:text-slate-600 focus-visible:ring-emerald-500/40 rounded-xl text-xs font-semibold"
            />
          </div>

          {/* Mass Markup Panel (only client specific sheets and not editing) */}
          {selectedSheet && selectedSheet.client_name !== null && !isEditing && (
            <div className="md:col-span-3 flex flex-wrap items-center gap-2 border border-slate-900 bg-slate-950/45 p-2 rounded-xl text-[10px] font-bold">
              <span className="text-slate-500 uppercase tracking-wider pl-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" /> Mass Markup:
              </span>
              
              {/* Type Select */}
              <select
                value={markupType}
                onChange={(e) => setMarkupType(e.target.value as any)}
                className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-1.5 py-1 text-[10px] outline-none"
              >
                <option value="percent">Percent (+/- %)</option>
                <option value="fixed">Fixed Amt (+/- $)</option>
              </select>

              {/* Value input */}
              <Input
                type="number"
                step="any"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                placeholder="e.g. 10 or -5"
                className="bg-slate-900 border-slate-800 text-slate-200 h-7 text-[10px] font-mono w-24 shrink-0 px-2 py-0.5 rounded"
              />

              {/* Target Category select */}
              <select
                value={markupCategory}
                onChange={(e) => setMarkupCategory(e.target.value)}
                className="bg-slate-900 text-slate-350 border border-slate-800 rounded px-1.5 py-1 text-[10px] max-w-[120px] outline-none"
              >
                <option value="all">All Sections</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <Button 
                onClick={handleApplyMassMarkup}
                className="h-7 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-450 font-bold px-3 text-[10px] rounded shrink-0 ml-auto"
                disabled={isPending || !markupValue}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER CATEGORIES TABLES GRID */}
      <div className="space-y-8">
        {Object.entries(filteredRatesGrouped).length === 0 ? (
          <div className="bg-[#0a0a0c] border border-slate-900 rounded-2xl p-12 text-center text-slate-500 italic text-xs">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-700 mb-2 animate-bounce" />
            No rate concepts matching search.
          </div>
        ) : (
          Object.entries(filteredRatesGrouped).map(([catName, list]) => {
            const allSelectedInCat = list.every(r => selectedConceptIds.has(r.id));
            
            return (
              <div key={catName} className="space-y-3">
                {/* Category Header */}
                <div className="flex justify-between items-center bg-[#07080a] border border-slate-900 px-4 py-2.5 rounded-xl">
                  <div className="flex items-center gap-3">
                    {/* Checkbox select all in category */}
                    {!isEditing && (
                      <input 
                        type="checkbox"
                        checked={allSelectedInCat}
                        onChange={() => handleToggleSelectCategory(catName, list)}
                        className="rounded border-slate-800 bg-slate-950 text-emerald-650 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4 shrink-0"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-200">
                        {catName}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-emerald-400 border border-slate-850 rounded">
                    {list.length} Concepts
                  </span>
                </div>

                {/* Table list */}
                <div className="bg-[#020203] border border-slate-900 rounded-xl overflow-hidden shadow-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0a0a0c] border-b border-slate-900 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                      <tr>
                        {!isEditing && <th className="p-3 w-10 text-center">Select</th>}
                        <th className="p-3">Service Description</th>
                        <th className="p-3 w-48">Rate Cost ($)</th>
                        <th className="p-3">Notes & Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-950 text-slate-350">
                      {list.map(r => {
                        const isRowSelected = selectedConceptIds.has(r.id);
                        
                        return (
                          <tr 
                            key={r.id} 
                            onClick={() => !isEditing && handleToggleSelectRow(r.id)}
                            className={`hover:bg-slate-900/10 transition-all ${
                              isRowSelected ? "bg-emerald-950/5 text-emerald-100/90" : ""
                            }`}
                          >
                            {!isEditing && (
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox"
                                  checked={isRowSelected}
                                  onChange={() => handleToggleSelectRow(r.id)}
                                  className="rounded border-slate-800 bg-slate-950 text-emerald-650 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4 shrink-0"
                                />
                              </td>
                            )}

                            {/* Concept Name */}
                            <td className="p-3 font-extrabold max-w-sm leading-relaxed">{r.name}</td>
                            
                            {/* Rate Cost cell */}
                            <td className="p-3" onClick={(e) => isEditing && e.stopPropagation()}>
                              {isEditing ? (
                                <Input
                                  value={editRates[r.id]?.rate || ""}
                                  onChange={(e) => handleRateInputChange(r.id, 'rate', e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-slate-200 h-8 font-mono text-xs font-bold"
                                />
                              ) : (
                                <span className="font-bold font-mono text-emerald-450 text-sm">{r.rate}</span>
                              )}
                            </td>

                            {/* Concept Notes cell */}
                            <td className="p-3 text-slate-450 leading-relaxed font-semibold" onClick={(e) => isEditing && e.stopPropagation()}>
                              {isEditing ? (
                                <Input
                                  value={editRates[r.id]?.notes || ""}
                                  onChange={(e) => handleRateInputChange(r.id, 'notes', e.target.value)}
                                  className="bg-slate-950 border-slate-800 text-slate-300 h-8 text-xs font-medium"
                                />
                              ) : (
                                r.notes || <span className="text-slate-655 italic font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* FLOAT ACTION BAR FOR EDIT SAVE OR CLIPBOARD COPY */}
      {!isEditing && selectedConceptIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="text-xs font-bold text-slate-450 pl-1">
            <span className="text-emerald-400 font-black">{selectedConceptIds.size}</span> rate concepts selected
          </div>
          <Button 
            onClick={handleCopySelected}
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-4 shadow-lg shadow-emerald-500/20"
          >
            {copySuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? "Copied!" : "Copy Selected Rates"}
          </Button>
        </div>
      )}

    </div>
  );
}

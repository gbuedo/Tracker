"use client";

import { useState } from "react";
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
import { addLog, createBillableConcept } from "@/actions/shipments";
import { FileCode2, Sparkles, DollarSign, Plus, Trash2, Check, ArrowRight, Table as TableIcon } from "lucide-react";
import { BillableConcept, Shipment } from "@/lib/types";

interface EmailQuoteParserProps {
  shipment: Shipment;
  billableConcepts: BillableConcept[];
}

interface ParsedItem {
  id: string;
  conceptName: string;
  costRate: number | "";
  costUnit: "flat" | "kg" | "chw" | "lb" | "tn" | "pcs";
  sellingRate: number | "";
  sellingUnit: "flat" | "kg" | "chw" | "lb" | "tn" | "pcs";
}

export function EmailQuoteParser({ shipment, billableConcepts }: EmailQuoteParserProps) {
  const shipmentId = shipment.id;
  const [open, setOpen] = useState(false);
  const [sellingText, setSellingText] = useState("");
  const [costText, setCostText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Helper to extract concepts and values from block of text
  const parseQuoteText = (text: string): { name: string; amount: number; unit: "flat" | "kg" | "chw" | "lb" | "tn" | "pcs" }[] => {
    const lines = text.split(/\r?\n/);
    const results: { name: string; amount: number; unit: "flat" | "kg" | "chw" | "lb" | "tn" | "pcs" }[] = [];

    // Common concepts list to help clean up names
    const commonConcepts = [
      "air freight", "ocean freight", "in & out", "storage", 
      "customs clearance", "customs", "fuel surcharge", "fuel",
      "handling fee", "handling", "delivery", "inland", "security fee",
      "cartage", "documentation", "messenger", "airport transfer",
      "war risk", "ams", "isf", "pier pass", "chassis", "local delivery"
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract numeric values: looking for numbers with $, USD, or just decimals/ints
      const amountRegex = /(?:\$|usd|eur)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:\$|usd|eur)?/i;
      const match = trimmed.match(amountRegex);
      if (!match) return;

      const rawAmount = match[1].replace(/,/g, "");
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) return;

      // The name is usually the text content around the number
      // We remove the matched number part and currency signs
      let cleanName = trimmed.replace(match[0], "").trim();
      
      // Clean up common prefix/suffix characters
      cleanName = cleanName.replace(/^[-–—:*+•\s]+/g, "").replace(/[-–—:*+•\s]+$/g, "");
      cleanName = cleanName.replace(/[:=]+/g, "").trim();

      // Check if we can map it to a standard concept or clean it up
      let matchedConcept = "";
      const lowerClean = cleanName.toLowerCase();
      const lowerLine = line.toLowerCase();
      
      let unit: "flat" | "kg" | "chw" | "lb" | "tn" | "pcs" = "flat";
      if (lowerLine.includes("/kg") || lowerLine.includes("per kg") || lowerLine.includes("per kilo") || lowerLine.includes("kilo rate")) {
        unit = "kg";
      } else if (lowerLine.includes("/chw") || lowerLine.includes("per chw") || lowerLine.includes("chargeable") || lowerLine.includes("w/m") || lowerLine.includes("kg/vol")) {
        unit = "chw";
      } else if (lowerLine.includes("/lb") || lowerLine.includes("per lb") || lowerLine.includes("pound")) {
        unit = "lb";
      } else if (lowerLine.includes("/ton") || lowerLine.includes("per ton") || lowerLine.includes("tn")) {
        unit = "tn";
      } else if (lowerLine.includes("/pcs") || lowerLine.includes("per piece") || lowerLine.includes("per pc")) {
        unit = "pcs";
      }

      for (const concept of commonConcepts) {
        if (lowerClean.includes(concept)) {
          matchedConcept = concept;
          break;
        }
      }

      const displayName = matchedConcept 
        ? matchedConcept.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : cleanName || "Logistics Concept";

      results.push({
        name: displayName,
        amount: amount,
        unit
      });
    });

    return results;
  };
  const getMultipliedValue = (rate: number | "", unit: string) => {
    if (rate === "") return 0;
    const grossWeight = shipment.kgs || 0;
    const chgWeight = shipment.chw || 0;
    const pieces = shipment.pcs || 1;
    
    switch (unit) {
      case "kg":
        return rate * grossWeight;
      case "chw":
        return rate * chgWeight;
      case "lb":
        return rate * (grossWeight * 2.20462);
      case "tn":
        return rate * (grossWeight / 1000);
      case "pcs":
        return rate * pieces;
      case "flat":
      default:
        return rate;
    }
  };

  const handleParse = () => {
    setIsParsing(true);
    
    // Parse selling items and cost items
    const parsedSelling = parseQuoteText(sellingText);
    const parsedCosts = parseQuoteText(costText);

    // Merge them by concept matching
    const itemsMap: Record<string, ParsedItem> = {};
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

    // Process costs first
    parsedCosts.forEach((costItem, index) => {
      const key = normalize(costItem.name);
      itemsMap[key] = {
        id: `parsed-cost-${index}-${Date.now()}`,
        conceptName: costItem.name,
        costRate: costItem.amount,
        costUnit: costItem.unit,
        sellingRate: "",
        sellingUnit: "flat"
      };
    });

    // Merge/process selling
    parsedSelling.forEach((sellItem, index) => {
      const key = normalize(sellItem.name);
      
      // Try to find matching cost
      const existing = Object.values(itemsMap).find(item => 
        normalize(item.conceptName).includes(key) || key.includes(normalize(item.conceptName))
      );

      if (existing) {
        existing.sellingRate = sellItem.amount;
        existing.sellingUnit = sellItem.unit;
      } else {
        itemsMap[key] = {
          id: `parsed-sell-${index}-${Date.now()}`,
          conceptName: sellItem.name,
          costRate: "",
          costUnit: "flat",
          sellingRate: sellItem.amount,
          sellingUnit: sellItem.unit
        };
      }
    });

    setParsedItems(Object.values(itemsMap));
    setIsParsing(false);
    setShowTable(true);
  };

  const handleUpdateItem = (id: string, field: keyof ParsedItem, val: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === "conceptName" || field === "costUnit" || field === "sellingUnit") {
          return { ...item, [field]: val };
        } else {
          const num = val === "" ? "" : parseFloat(val);
          return { ...item, [field]: isNaN(num as number) ? "" : num };
        }
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddRow = () => {
    setParsedItems(prev => [
      ...prev, 
      {
        id: `manual-new-${Date.now()}`,
        conceptName: "",
        costRate: "",
        costUnit: "flat",
        sellingRate: "",
        sellingUnit: "flat"
      }
    ]);
  };

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      for (const item of parsedItems) {
        if (!item.conceptName.trim()) continue;

        // Check if there is an existing billable concept or create a new one
        let conceptId: number | null = null;
        const matchedConcept = billableConcepts.find(
          c => c.name.toLowerCase().trim() === item.conceptName.toLowerCase().trim()
        );

        if (matchedConcept) {
          conceptId = matchedConcept.id;
        } else {
          // Dynamic concept creation
          const newConcept = await createBillableConcept(item.conceptName.trim());
          conceptId = newConcept.id;
        }

        const costVal = getMultipliedValue(item.costRate, item.costUnit);
        const sellVal = getMultipliedValue(item.sellingRate, item.sellingUnit);

        // Add log for cost if specified
        if (costVal > 0) {
          const unitDesc = item.costUnit !== "flat" ? ` @ $${item.costRate}/${item.costUnit}` : "";
          await addLog({
            shipment_id: shipmentId,
            event_text: `${item.conceptName}${unitDesc} cost captured from parsed quote`,
            is_external: false,
            billable_concept_id: conceptId,
            amount: costVal,
            amount_type: "cost"
          });
        }

        // Add log for selling if specified
        if (sellVal > 0) {
          const unitDesc = item.sellingUnit !== "flat" ? ` @ $${item.sellingRate}/${item.sellingUnit}` : "";
          await addLog({
            shipment_id: shipmentId,
            event_text: `${item.conceptName}${unitDesc} selling rate captured from parsed quote`,
            is_external: true,
            billable_concept_id: conceptId,
            amount: sellVal,
            amount_type: "selling"
          });
        }
      }

      // Reset states
      setSellingText("");
      setCostText("");
      setParsedItems([]);
      setShowTable(false);
      setOpen(false);
    } catch (e) {
      console.error("Failed to save quotes logs:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setParsedItems([]);
        setShowTable(false);
      }
    }}>
      <DialogTrigger render={<Button className="h-9 px-4 text-xs bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 text-sky-400 font-bold transition-all shadow-sm rounded-lg" />}>
        <span className="flex items-center"><FileCode2 className="mr-2 h-4 w-4" /> AI Paste Quote Parser</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl p-8">
        <DialogHeader className="border-b border-slate-850 pb-4">
          <DialogTitle className="text-lg font-black uppercase flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
            AI Email Pricing Quote Recognizer
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-semibold">
            Paste selling tariffs or buying costs from your email correspondence. Our engine automatically cross-references concepts, matches margins, and populates spreadsheet billing logs.
          </DialogDescription>
        </DialogHeader>

        {!showTable ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="selling_quotes" className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Pasted Selling Quote (Email Text)
                </Label>
                <textarea
                  id="selling_quotes"
                  value={sellingText}
                  onChange={(e) => setSellingText(e.target.value)}
                  placeholder="Paste selling rates email details. E.g.:&#10;Ocean Freight: USD 1,500&#10;Local Handling: $250&#10;Customs clearance: 150"
                  className="w-full h-48 bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-xs font-medium focus-visible:ring-sky-500/50 focus-visible:outline-none p-3 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_quotes" className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Pasted Cost Quote (Supplier Buying Tariff)
                </Label>
                <textarea
                  id="cost_quotes"
                  value={costText}
                  onChange={(e) => setCostText(e.target.value)}
                  placeholder="Paste buying rates email details. E.g.:&#10;Ocean Freight cost: $900&#10;Coordinating & handling: 150"
                  className="w-full h-48 bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-650 text-xs font-medium focus-visible:ring-amber-500/50 focus-visible:outline-none p-3 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="bg-transparent border-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={isParsing || (!sellingText.trim() && !costText.trim())}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                {isParsing ? "Recognizing Tariff Data..." : "Analyze & Preview Sheets"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-850">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  Liquidations Pricing Table Preview
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Edit cells to fix OCR misalignments before logging to database.</p>
              </div>
              <Button
                onClick={handleAddRow}
                className="h-8 text-[11px] bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>

            {/* Editable Spreadsheet Table */}
            <div className="border border-slate-850 rounded-xl overflow-x-auto bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-350">
              <table className="w-full text-left border-collapse text-[11px] font-semibold min-w-[650px]">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-2.5 w-[25%]">Concept</th>
                    <th className="p-2.5 w-[33%]">Cost Tariff (Rate / Unit / Calc)</th>
                    <th className="p-2.5 w-[33%]">Selling Tariff (Rate / Unit / Calc)</th>
                    <th className="p-2.5 w-[7%] text-right">Profit</th>
                    <th className="p-2.5 w-[2%] text-center">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center italic text-slate-650">
                        No pricing concepts extracted. Use Add Row to load manually or reset.
                      </td>
                    </tr>
                  ) : (
                    parsedItems.map((item) => {
                      const costVal = getMultipliedValue(item.costRate, item.costUnit);
                      const sellVal = getMultipliedValue(item.sellingRate, item.sellingUnit);
                      const profitVal = sellVal - costVal;

                      const handleRateKeyDown = (
                        e: React.KeyboardEvent<HTMLInputElement>,
                        field: "costRate" | "sellingRate",
                        currentVal: number | ""
                      ) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const current = currentVal === "" ? 0 : Number(currentVal);
                          const step = e.shiftKey ? 10 : 1;
                          const newVal = e.key === "ArrowUp" ? current + step : Math.max(0, current - step);
                          // Format to 2 decimal places or keep clean
                          handleUpdateItem(item.id, field, Number(newVal.toFixed(2)).toString());
                        }
                      };

                      return (
                        <tr key={item.id} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition-colors">
                          <td className="p-1.5">
                            <Input
                              value={item.conceptName}
                              onChange={(e) => handleUpdateItem(item.id, "conceptName", e.target.value)}
                              className="h-8 bg-slate-900/40 border-slate-800 text-slate-200 text-xs font-bold"
                              placeholder="Concept title (e.g. Inland)"
                            />
                          </td>
                          <td className="p-1.5">
                            <div className="flex items-center gap-1.5">
                              {/* Rate Input */}
                              <div className="relative flex-grow max-w-[95px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[9px]">$</span>
                                <Input
                                  type="number"
                                  value={item.costRate}
                                  onChange={(e) => handleUpdateItem(item.id, "costRate", e.target.value)}
                                  onKeyDown={(e: any) => handleRateKeyDown(e, "costRate", item.costRate)}
                                  className="h-8 pl-5 pr-1.5 bg-slate-900/40 border-slate-800 text-slate-200 text-xs font-mono text-left font-bold"
                                  placeholder="0.00"
                                  step="any"
                                />
                              </div>
                              {/* Unit Selector */}
                              <select
                                value={item.costUnit}
                                onChange={(e) => handleUpdateItem(item.id, "costUnit", e.target.value)}
                                className="h-8 w-[72px] bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-sky-500/30 px-1"
                              >
                                <option value="flat">Flat</option>
                                <option value="kg">/Kg (G)</option>
                                <option value="chw">/Kg (Chw)</option>
                                <option value="lb">/Lb</option>
                                <option value="tn">/Ton</option>
                                <option value="pcs">/Piece</option>
                              </select>
                              {/* Multiplied Sum */}
                              <span className="text-[10px] font-mono text-amber-500 font-bold shrink-0 min-w-[45px] text-right">
                                ${costVal.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="p-1.5">
                            <div className="flex items-center gap-1.5">
                              {/* Rate Input */}
                              <div className="relative flex-grow max-w-[95px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[9px]">$</span>
                                <Input
                                  type="number"
                                  value={item.sellingRate}
                                  onChange={(e) => handleUpdateItem(item.id, "sellingRate", e.target.value)}
                                  onKeyDown={(e: any) => handleRateKeyDown(e, "sellingRate", item.sellingRate)}
                                  className="h-8 pl-5 pr-1.5 bg-slate-900/40 border-slate-800 text-slate-200 text-xs font-mono text-left font-bold"
                                  placeholder="0.00"
                                  step="any"
                                />
                              </div>
                              {/* Unit Selector */}
                              <select
                                value={item.sellingUnit}
                                onChange={(e) => handleUpdateItem(item.id, "sellingUnit", e.target.value)}
                                className="h-8 w-[72px] bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-sky-500/30 px-1"
                              >
                                <option value="flat">Flat</option>
                                <option value="kg">/Kg (G)</option>
                                <option value="chw">/Kg (Chw)</option>
                                <option value="lb">/Lb</option>
                                <option value="tn">/Ton</option>
                                <option value="pcs">/Piece</option>
                              </select>
                              {/* Multiplied Sum */}
                              <span className="text-[10px] font-mono text-sky-400 font-bold shrink-0 min-w-[45px] text-right">
                                ${sellVal.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className={`p-1.5 text-right font-mono font-bold text-xs leading-none ${
                            profitVal >= 0 ? 'text-emerald-400' : 'text-rose-450'
                          }`}>
                            {profitVal >= 0 ? "+" : ""}${profitVal.toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-slate-850">
              <Button
                variant="outline"
                onClick={() => setShowTable(false)}
                className="bg-transparent border-slate-800 text-slate-400"
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmAndSave}
                disabled={isSaving || parsedItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSaving ? "Saving to Shipment Logs..." : "Confirm & Save Liquidation"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

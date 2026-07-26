"use client";

import React, { useState } from "react";
import { Carrier } from "../lib/types";
import { updateCarrier } from "../actions/shipments";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Building, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Save, 
  Edit3, 
  X,
  Truck,
  Archive
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ShipmentCarrierCardProps {
  carrier: Carrier;
  shipmentId: number;
}

export function ShipmentCarrierCard({ carrier, shipmentId }: ShipmentCarrierCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState(carrier.name || "");
  const [handlingAgent, setHandlingAgent] = useState(carrier.handling_agent || "");
  const [phone, setPhone] = useState(carrier.phone || "");
  const [email, setEmail] = useState(carrier.email || "");
  const [address, setAddress] = useState(carrier.address || "");
  const [firmsCode, setFirmsCode] = useState(carrier.firms_code || "");
  const [importFee, setImportFee] = useState(String(carrier.import_fee || ""));
  const [paymentMethod, setPaymentMethod] = useState(carrier.payment_method || "");
  const [storage, setStorage] = useState(carrier.storage || "");
  const [notes, setNotes] = useState(carrier.notes || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await updateCarrier(
        carrier.id,
        {
          name: name.trim(),
          handling_agent: handlingAgent.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          firms_code: firmsCode.trim() || null,
          import_fee: importFee.trim() || null,
          payment_method: paymentMethod.trim() || null,
          storage: storage.trim() || null,
          notes: notes.trim() || null,
        },
        shipmentId
      );

      setSuccess(true);
      setIsEditing(false);
      router.refresh();

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to update carrier:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset values to carrier prop
    setName(carrier.name || "");
    setHandlingAgent(carrier.handling_agent || "");
    setPhone(carrier.phone || "");
    setEmail(carrier.email || "");
    setAddress(carrier.address || "");
    setFirmsCode(carrier.firms_code || "");
    setImportFee(String(carrier.import_fee || ""));
    setPaymentMethod(carrier.payment_method || "");
    setStorage(carrier.storage || "");
    setNotes(carrier.notes || "");
    setIsEditing(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900 px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#8B4E43] dark:text-[#C97A57]" />
          <div>
            <h3 className="font-extrabold text-sm text-foreground">Transport Directory</h3>
            <p className="text-[10px] text-muted-foreground font-mono">Matched prefix: {carrier.code}</p>
          </div>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs text-[#8B4E43] hover:text-[#7A4036] hover:bg-[#FDF1EE] dark:hover:bg-[#FDF1EE]/10 font-bold gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Info
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Carrier Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 font-sans text-xs"
                placeholder="e.g. American Airlines"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Handling Agent</label>
              <Input
                value={handlingAgent}
                onChange={(e) => setHandlingAgent(e.target.value)}
                className="h-9 font-sans text-xs"
                placeholder="e.g. Alliance Ground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 font-mono text-xs"
                placeholder="e.g. +1 (305) 555-0199"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 font-mono text-xs"
                placeholder="e.g. cargo@carrier.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Firms Code</label>
              <Input
                value={firmsCode}
                onChange={(e) => setFirmsCode(e.target.value)}
                className="h-9 font-mono text-xs"
                placeholder="e.g. L123"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Import Fee</label>
              <Input
                value={importFee}
                onChange={(e) => setImportFee(e.target.value)}
                className="h-9 font-sans text-xs"
                placeholder="e.g. $125 or 0.05"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment Method</label>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9 font-sans text-xs"
                placeholder="e.g. CargoPay, Credit Card"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Storage terms</label>
              <Input
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="h-9 font-sans text-xs"
                placeholder="e.g. 2 days free, then $10/day"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Address / Location</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 font-sans text-xs"
              placeholder="Cargo Building 75, MIA Airport"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Private Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed resize-none dark:bg-input/30"
              placeholder="Special instructions, gate codes, or contact names..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-9 text-xs gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-9 text-xs bg-[#E8A99A] hover:bg-[#D4907F] text-white font-bold gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Carrier"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{name || carrier.name}</h4>
            {handlingAgent && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Handling Agent: <span className="font-bold text-foreground">{handlingAgent}</span>
              </p>
            )}
          </div>

          {/* Key fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
            {phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#7BB5A0] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Phone</p>
                  <a href={`tel:${phone}`} className="font-bold font-mono text-foreground hover:text-[#8B4E43] hover:underline">
                    {phone}
                  </a>
                </div>
              </div>
            )}

            {email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#8BBAD4] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Email</p>
                  <a href={`mailto:${email}`} className="font-bold font-mono text-foreground hover:text-[#8B4E43] hover:underline break-all">
                    {email}
                  </a>
                </div>
              </div>
            )}

            {firmsCode && (
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Firms Code</p>
                  <span className="font-bold font-mono text-foreground">{firmsCode}</span>
                </div>
              </div>
            )}

            {importFee && (
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Import Fee</p>
                  <span className="font-bold text-foreground">{importFee}</span>
                </div>
              </div>
            )}

            {paymentMethod && (
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Payment Method</p>
                  <span className="font-bold text-foreground">{paymentMethod}</span>
                </div>
              </div>
            )}

            {storage && (
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4 text-[#C97A57] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Storage Terms</p>
                  <span className="font-bold text-foreground">{storage}</span>
                </div>
              </div>
            )}
          </div>

          {address && (
            <div className="pt-2 border-t border-border/60 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Location / Address</p>
                <p className="text-muted-foreground font-semibold mt-0.5">{address}</p>
              </div>
            </div>
          )}

          {notes && (
            <div className="pt-2 border-t border-border/60 flex items-start gap-2.5 text-xs">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Special Notes</p>
                <p className="text-muted-foreground whitespace-pre-line font-medium mt-0.5">{notes}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs font-bold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Carrier details saved successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

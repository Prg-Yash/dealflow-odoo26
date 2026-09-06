"use client";

import { useState, useEffect } from "react";
import { Building2, Sparkles, Shield, Loader2, ArrowRight, Globe, Check } from "lucide-react";
import { Modal } from "./modal";

export interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
  onCreateOrg?: (data: { name: string; slug?: string; currency: string }) => Promise<void> | void;
  isLoading?: boolean;
}

const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

export function CreateOrgModal({
  open,
  onClose,
  onCreateOrg,
  isLoading = false,
}: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name unless manually modified
  useEffect(() => {
    if (!isSlugCustomized && name.trim()) {
      const generated = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  }, [name, isSlugCustomized]);

  const handleClose = () => {
    if (submitting || isLoading) return;
    setName("");
    setSlug("");
    setIsSlugCustomized(false);
    setCurrency("INR");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (onCreateOrg) {
        await onCreateOrg({
          name: name.trim(),
          slug: slug.trim() || undefined,
          currency: currency.toUpperCase(),
        });
      }
      handleClose();
    } catch (err: any) {
      console.error("Create organization failed:", err);
      setError(err?.message || "Failed to create organization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create New Organization" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header Visual Context */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-50/80 border border-orange-200/70 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-[#ff5e3a] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#ff5e3a]/25">
            <Building2 size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Multi-Tenant Organization</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              You will automatically become the <span className="font-semibold text-[#ff5e3a]">Admin</span> of this workspace.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Organization Name Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Organization Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Acme Global Logistics, Nexus Tech"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 transition-all bg-white"
            autoFocus
          />
        </div>

        {/* Workspace Slug Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Workspace Slug (Unique URL Key)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-mono text-slate-400 select-none">
              dealflow360.app/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setIsSlugCustomized(true);
              }}
              placeholder="acme-global"
              className="w-full pl-36 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 transition-all bg-white"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Used for quotation links, customer portal subpaths, and team onboarding.
          </p>
        </div>

        {/* Primary Currency Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Default Commercial Currency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = currency === curr.code;
              return (
                <button
                  type="button"
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#ff5e3a] bg-orange-50/70 text-[#ff5e3a] shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono">{curr.symbol} {curr.code}</span>
                  {isSelected && <Check size={12} className="text-[#ff5e3a]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Governance Notice */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Shield size={14} className="text-emerald-600" />
            <span>Administrator Privileges Included</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            As the creator, you can invite sales reps, managers, and finance operators, define discount approval rules, manage warehouses, and configure product pricing.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting || isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isLoading || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#e04f2d] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Creating Workspace...</span>
              </>
            ) : (
              <>
                <Building2 size={14} />
                <span>Create & Set as Active</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

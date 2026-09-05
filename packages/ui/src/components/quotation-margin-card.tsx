"use client";

import { CheckCircle2, AlertTriangle, ShieldAlert, Send, Save, ArrowRight } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./button";

interface QuotationMarginCardProps {
  grossSubtotal: number;
  totalDiscount: number;
  netTotal: number;
  totalCost: number;
  marginAmount: number;
  marginPercent: number;
  isSubmitting?: boolean;
  onSaveDraft?: () => void;
  onSubmitForApproval?: () => void;
  className?: string;
}

export function QuotationMarginCard({
  grossSubtotal,
  totalDiscount,
  netTotal,
  totalCost,
  marginAmount,
  marginPercent,
  isSubmitting = false,
  onSaveDraft,
  onSubmitForApproval,
  className,
}: QuotationMarginCardProps) {
  const discountPercent = grossSubtotal > 0 ? (totalDiscount / grossSubtotal) * 100 : 0;

  // Determine governance approval level
  let governanceLevel: {
    tier: string;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof CheckCircle2;
  };

  if (discountPercent > 20 || marginPercent < 35) {
    governanceLevel = {
      tier: "Tier 2 Escalation",
      label: "Finance & VP Sign-off Required",
      description: "Discounts above 20% or margins under 35% require dual executive sign-offs.",
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      icon: ShieldAlert,
    };
  } else if (discountPercent > 10 || netTotal > 50000) {
    governanceLevel = {
      tier: "Tier 1 Approval",
      label: "Sales Manager Review Required",
      description: "Discounts above 10% or deals exceeding ₹50K require Sales Director approval.",
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: AlertTriangle,
    };
  } else {
    governanceLevel = {
      tier: "Auto-Approve",
      label: "Pre-Approved Deal",
      description: "Standard pricing rules satisfied. Eligible for instant customer generation.",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: CheckCircle2,
    };
  }

  const GovIcon = governanceLevel.icon;

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Deal Economics &amp; Margin</h3>
        <span
          className={cn(
            "text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
            governanceLevel.bgColor,
            governanceLevel.color,
            governanceLevel.borderColor
          )}
        >
          {governanceLevel.tier}
        </span>
      </div>

      {/* Margin Gauge Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Calculated Gross Margin</span>
          <span
            className={cn(
              "text-lg font-black font-mono",
              marginPercent >= 45 ? "text-emerald-600" : marginPercent >= 35 ? "text-amber-600" : "text-rose-600"
            )}
          >
            {marginPercent.toFixed(1)}%
          </span>
        </div>

        {/* Meter bar */}
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 flex">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              marginPercent >= 45 ? "bg-emerald-500" : marginPercent >= 35 ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>Target: &gt;45%</span>
          <span>Warning: &lt;35%</span>
        </div>
      </div>

      {/* Financial Table Breakdown */}
      <div className="space-y-2.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Gross List Value</span>
          <span className="font-mono text-slate-800 font-medium">₹{Math.round(grossSubtotal).toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-amber-700 font-medium">
          <span>Total Discount ({discountPercent.toFixed(1)}%)</span>
          <span className="font-mono">-₹{Math.round(totalDiscount).toLocaleString()}</span>
        </div>

        <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-900 font-bold">
          <span>Net Contract Total</span>
          <span className="text-sm font-mono font-extrabold text-[#ff5e3a]">
            ₹{Math.round(netTotal).toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between text-slate-500 pt-1">
          <span>Estimated COGS (Cost Basis)</span>
          <span className="font-mono">₹{Math.round(totalCost).toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-emerald-700 font-semibold">
          <span>Gross Profit Contribution</span>
          <span className="font-mono">+₹{Math.round(marginAmount).toLocaleString()}</span>
        </div>
      </div>

      {/* Governance Banner */}
      <div
        className={cn(
          "p-3.5 rounded-xl border flex items-start gap-3 text-xs",
          governanceLevel.bgColor,
          governanceLevel.borderColor
        )}
      >
        <GovIcon size={18} className={cn("shrink-0 mt-0.5", governanceLevel.color)} />
        <div className="space-y-0.5">
          <div className={cn("font-bold", governanceLevel.color)}>{governanceLevel.label}</div>
          <div className="text-[11px] text-slate-600 leading-snug">{governanceLevel.description}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {onSubmitForApproval && (
          <Button
            onClick={onSubmitForApproval}
            disabled={isSubmitting || netTotal <= 0}
            className="w-full bg-[#ff5e3a] hover:bg-[#e04e2b] text-white font-bold h-10 shadow-sm flex items-center justify-center gap-2 text-xs"
          >
            {isSubmitting ? (
              <span>Submitting Proposal...</span>
            ) : (
              <>
                <Send size={14} />
                <span>Submit for Approval</span>
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        )}

        {onSaveDraft && (
          <Button
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSubmitting || netTotal <= 0}
            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 flex items-center justify-center gap-1.5"
          >
            <Save size={14} />
            <span>Save as Draft</span>
          </Button>
        )}
      </div>
    </div>
  );
}

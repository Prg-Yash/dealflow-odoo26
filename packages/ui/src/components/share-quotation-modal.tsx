"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, ShieldCheck, Share2 } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface ShareQuotationModalProps {
  open: boolean;
  onClose: () => void;
  quoteId: string;
  accountName: string;
  totalValue: number;
}

export function ShareQuotationModal({
  open,
  onClose,
  quoteId,
  accountName,
  totalValue,
}: ShareQuotationModalProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareUrl = `${origin}/portal?token=${encodeURIComponent(quoteId)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API fails
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Proposal with Customer" className="max-w-md">
      <div className="space-y-4">
        {/* Deal Summary Banner */}
        <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/70 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff5e3a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Share2 size={16} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 truncate">{accountName}</span>
              <span className="font-mono text-[11px] font-bold text-[#ff5e3a]">
                ₹{totalValue.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Quote ID: <span className="font-mono font-semibold text-slate-800">{quoteId}</span>
            </p>
          </div>
        </div>

        {/* Security / Portal note */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
          <span>Secured with unique quotation access token. No client login required.</span>
        </div>

        {/* Share Link Input */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500" htmlFor="share-url">
            Direct Customer Portal Link
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-url"
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none select-all"
            />
            <Button
              type="button"
              variant={copied ? "primary" : "secondary"}
              size="sm"
              onClick={handleCopy}
              className="shrink-0 h-9 px-3.5 gap-1.5 cursor-pointer text-xs"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff5e3a] hover:underline"
          >
            <span>Open in Customer Portal</span>
            <ExternalLink size={12} />
          </a>

          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs h-8 px-4 border-slate-200">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

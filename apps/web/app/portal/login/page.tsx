"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Key, Lock, ShieldCheck } from "lucide-react";
import { AuthCard } from "@repo/ui";
import { setStoredRole } from "../../../lib/roles";
import { isValidToken } from "../../../lib/validation";

export default function CustomerPortalLoginPage() {
  const router = useRouter();
  const [tokenOrEmail, setTokenOrEmail] = useState("DF-Q1042");
  const [tokenTouched, setTokenTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const tokenError = tokenTouched && !isValidToken(tokenOrEmail) ? "Please enter a valid token (min 3 chars) or email." : null;
  const isFormValid = isValidToken(tokenOrEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setTokenTouched(true);
      return;
    }

    setLoading(true);
    setStoredRole("customer");

    const token = tokenOrEmail.trim() || "DF-Q1042";
    router.push(`/portal?token=${encodeURIComponent(token)}`);
  };

  const handleQuickToken = (token: string) => {
    setTokenOrEmail(token);
    setTokenTouched(false);
  };

  return (
    <AuthCard
      title="Customer Quotation Portal"
      description="Enter your work email or quotation token to access your proposal"
      headerRightLink={{ label: "Internal Login", href: "/login" }}
      linkComponent={Link}
      banner={
        <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 p-3.5 flex items-start gap-3 text-left">
          <ShieldCheck size={18} className="text-[#ff5e3a] shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-slate-700">
            Secure buyer session. Enter the token provided in your quote invitation email.
          </p>
        </div>
      }
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
          <Link
            href="/login"
            className="text-xs text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Lock size={14} className="text-slate-400" />
            <span>Log in with Password (Internal Team)</span>
          </Link>
        </div>
      }
    >
      {/* Quick Demo Tokens */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
        <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
          Active Quote Proposals (Click to test):
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickToken("DF-Q1042")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              tokenOrEmail === "DF-Q1042"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            DF-Q1042 (Acme Cloud)
          </button>
          <button
            type="button"
            onClick={() => handleQuickToken("DF-Q2055")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              tokenOrEmail === "DF-Q2055"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            DF-Q2055 (FinTech)
          </button>
        </div>
      </div>

      {/* Form Elements */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quote-token">
            Quote Access Token or Work Email <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="quote-token"
              type="text"
              required
              value={tokenOrEmail}
              onChange={(e) => {
                setTokenOrEmail(e.target.value);
                setTokenTouched(true);
              }}
              placeholder="e.g. DF-Q1042"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all font-mono border ${
                tokenError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {tokenError && <span className="text-[11px] text-red-500 font-medium">{tokenError}</span>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Verifying..." : "Access Quotation"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}

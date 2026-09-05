"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { AuthCard, useToast } from "@repo/ui";
import { isValidEmail } from "../../../lib/validation";

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("email") || "";
    }
    return "";
  });
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const isFormValid = isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setEmailTouched(true);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit password reset request.");
      }

      toast.success(
        "Recovery Link Dispatched",
        `Instructions have been sent to ${email}. Check your inbox.`
      );
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message || "Failed to dispatch recovery link. Please try again.";
      setError(msg);
      toast.error("Request Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      description="Enter the email associated with your account and we'll send recovery instructions."
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Remember your password?{" "}
            <Link
              href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5"
            >
              Log In
            </Link>
          </p>
        </div>
      }
    >
      {submitted ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-slate-900">Check Your Inbox</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              We have sent a secure password recovery link to{" "}
              <strong className="text-slate-900 font-mono">{email}</strong>.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            Didn&apos;t receive an email? Check your spam folder or try requesting again in a few minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Try another email</span>
            </button>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <span>Back to login</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="resetEmail">
              Email Address <span className="text-[#ff5e3a]">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="resetEmail"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTouched(true);
                  if (error) setError(null);
                }}
                placeholder="name@company.com"
                className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                  emailError
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                }`}
              />
            </div>
            {emailError && <span className="text-[11px] text-red-500 font-medium">{emailError}</span>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Sending link...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}

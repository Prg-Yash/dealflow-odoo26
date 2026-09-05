"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Mail, CheckCircle2, ArrowLeft, Users } from "lucide-react";
import { AuthCard } from "@repo/ui";
import { ROLES, ALL_ROLES, inferRoleFromEmail, type UserRole } from "../../lib/roles";
import { isValidEmail } from "../../lib/validation";

export default function ForgotPasswordPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("sales_rep");
  const [email, setEmail] = useState("rep.alex@dealflow360.com");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryEmail = params.get("email");
      if (queryEmail) {
        setEmail(queryEmail);
        setSelectedRole(inferRoleFromEmail(queryEmail));
      }
    }
  }, []);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const isFormValid = isValidEmail(email);

  const handleRoleSelect = (roleKey: UserRole) => {
    const roleConfig = ROLES[roleKey];
    setSelectedRole(roleKey);
    setEmail(roleConfig.defaultEmail);
    setEmailTouched(false);
    setError(null);
  };

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setEmailTouched(true);
    setSelectedRole(inferRoleFromEmail(newEmail));
  };

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
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit password reset request.");
      }

      setSubmitted(true);
    } catch (err) {
      console.warn("API request failed, proceeding in demo mode:", err);
      setSubmitted(true);
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
      {/* 5-User Role Quick Selector matching Login Page */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} className="text-[#ff5e3a]" />
            Demo User Credentials (Click to prefill):
          </span>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
            Password: Password123!
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {ALL_ROLES.map((r) => {
            const isActive = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r.id)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer truncate ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm font-semibold"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title={`${r.title} — ${r.defaultEmail}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 mt-0.5">
          <span className="truncate">
            User: <strong className="text-slate-800">{ROLES[selectedRole]?.defaultName}</strong> &bull; <span className="font-mono text-slate-600">{ROLES[selectedRole]?.defaultEmail}</span>
          </span>
          <span className="text-[#ff5e3a] font-medium shrink-0 ml-2">
            Role: {ROLES[selectedRole]?.label}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left">
          {error}
        </div>
      )}

      {submitted ? (
        <div className="flex flex-col gap-4 text-left mt-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              If an account exists for <strong className="text-slate-900">{email}</strong>, password reset instructions have been dispatched. In development mode, the default account password remains <strong className="font-mono text-slate-900">Password123!</strong>.
            </div>
          </div>

          <Link
            href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Return to Log In</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="recoveryEmail">
              Email Address <span className="text-[#ff5e3a]">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="recoveryEmail"
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="name@company.com"
                className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
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
              <span>{loading ? "Sending link..." : "Send Recovery Link"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}

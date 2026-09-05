"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { AuthCard } from "@repo/ui";
import { setStoredRole } from "../../../lib/roles";
import { isValidPassword, isValidName } from "../../../lib/validation";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [nameTouched, setNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const nameError = nameTouched && !isValidName(name) ? "Name must be at least 2 characters." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;

  const isFormValid = isValidName(name) && isValidPassword(password);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided in the URL.");
      setLoading(false);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`${apiUrl}/api/invitations/verify?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to verify invitation token.");
        }

        setInvitation(data.data || data);
      } catch (err: any) {
        console.error("Verification failed:", err);
        setError(err.message || "Invalid or expired invitation token.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token, apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setNameTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/api/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to accept invitation.");
      }

      // Role redirect mapping
      const assignedRole = (invitation?.role || "CUSTOMER").toLowerCase();
      if (assignedRole === "customer") {
        setStoredRole("customer");
        router.push("/portal");
      } else if (assignedRole === "admin") {
        setStoredRole("admin");
        router.push("/dashboard/admin");
      } else if (assignedRole === "sales_rep") {
        setStoredRole("sales_rep");
        router.push("/dashboard/sale-ref");
      } else if (assignedRole === "sales_manager") {
        setStoredRole("manager");
        router.push("/dashboard/manager");
      } else if (assignedRole === "finance_ops") {
        setStoredRole("finance");
        router.push("/dashboard/finance");
      } else {
        setStoredRole("customer");
        router.push("/portal");
      }
    } catch (err: any) {
      console.error("Acceptance failed:", err);
      setError(err.message || "Could not complete account setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff5e3a]" />
        <p className="text-sm font-medium">Verifying invitation token...</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-xl border border-red-100 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Invitation Unavailable</h3>
        <p className="text-sm text-slate-600 mb-6">{error}</p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#ff5e3a] text-white font-semibold text-sm hover:bg-[#ea4e28] transition"
        >
          Go to Standard Registration
        </Link>
      </div>
    );
  }

  return (
    <AuthCard
      title="Accept Invitation"
      description={`Join ${invitation?.organization?.name || "DealFlow360"} to access your quotations and collaboration portal`}
      activeTab="signup"
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Already have credentials?{" "}
            <Link href="/login" className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5">
              Log In
            </Link>
          </p>
        </div>
      }
    >
      {/* Invitation Context Summary */}
      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-900 flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-bold">
          <span className="inline-flex items-center gap-1 text-blue-700">
            <Building2 size={14} />
            {invitation?.organization?.name || "Organization"}
          </span>
          <span className="inline-flex items-center gap-1 text-[#ff5e3a] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 uppercase text-[10px] tracking-wider">
            <Sparkles size={11} />
            {invitation?.role === "CUSTOMER" ? "Customer Account" : invitation?.role}
          </span>
        </div>
        <p className="text-blue-800">
          Invited email: <strong className="text-blue-950 font-semibold">{invitation?.email}</strong>
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="name">
            Your Full Name <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              placeholder="Sarah Jenkins"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                nameError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {nameError && <span className="text-[11px] text-red-500 font-medium">{nameError}</span>}
        </div>

        {/* Verified Email (Read-only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="invEmail">
            Email Address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="invEmail"
              type="email"
              disabled
              value={invitation?.email || ""}
              className="w-full bg-slate-100 text-slate-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm cursor-not-allowed border border-slate-200"
            />
          </div>
        </div>

        {/* Set Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
            Create Account Password <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              placeholder="••••••••••••"
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                passwordError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && <span className="text-[11px] text-red-500 font-medium">{passwordError}</span>}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{submitting ? "Joining Workspace..." : "Accept & Launch Portal"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff5e3a]" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

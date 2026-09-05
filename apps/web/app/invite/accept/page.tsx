"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@repo/ui";
import { signIn, useSession } from "../../../lib/auth-client";
import { setStoredRole, type UserRole } from "../../../lib/roles";

interface VerificationData {
  valid: boolean;
  email: string;
  role: string;
  organizationName: string;
  currency: string;
  invitedBy: string;
  expiresAt: string;
}

const ROLE_METADATA: Record<
  string,
  { label: string; badge: string; description: string; appRole: UserRole; redirect: string }
> = {
  ADMIN: {
    label: "Organization Administrator",
    badge: "bg-slate-900 text-white",
    description: "Full governance authority over catalog, pricing rules, inventory & team members.",
    appRole: "admin",
    redirect: "/dashboard/admin",
  },
  SALES_MANAGER: {
    label: "Sales Manager / Director",
    badge: "bg-amber-100 text-amber-800 border border-amber-300",
    description: "Authority to approve discount thresholds, lead sales reps, and monitor deal velocity.",
    appRole: "manager",
    redirect: "/dashboard/manager",
  },
  SALES_REP: {
    label: "Sales Representative",
    badge: "bg-sky-100 text-sky-800 border border-sky-300",
    description: "Build dynamic quotations, manage accounts, and accelerate deal workflows.",
    appRole: "sales_rep",
    redirect: "/dashboard/sale-ref",
  },
  FINANCE_OPS: {
    label: "Finance & Operations Specialist",
    badge: "bg-purple-100 text-purple-800 border border-purple-300",
    description: "Oversee invoice reconciliation, payment milestones, and revenue operations.",
    appRole: "finance",
    redirect: "/dashboard/finance",
  },
  CUSTOMER: {
    label: "Customer / Procurement Buyer",
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    description: "Review commercial proposals, negotiate deal line items, and approve sign-offs.",
    appRole: "customer",
    redirect: "/portal",
  },
};

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 1. Verify invitation token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setVerificationError("No invitation token was provided in the link. Please check the URL in your invitation email.");
      return;
    }

    const verifyToken = async () => {
      try {
        setIsLoading(true);
        setVerificationError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

        const res = await fetch(`${apiUrl}/api/invitations/verify?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok || !data.valid) {
          throw new Error(data.message || "This invitation token is invalid or has expired.");
        }

        setVerification(data);
        if (session?.user?.name) {
          setFullName(session.user.name);
        }
      } catch (err: any) {
        setVerificationError(
          err?.message || "Failed to verify invitation token. It may have expired or been revoked."
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, session]);

  const isExistingUser =
    !!session?.user?.id &&
    !!verification?.email &&
    session.user.email?.toLowerCase() === verification.email.toLowerCase();

  // 2. Handle Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !verification) return;

    // Validate password for new registration
    if (!isExistingUser) {
      if (!fullName.trim()) {
        setFormError("Please enter your full name.");
        return;
      }
      if (!password || password.length < 8) {
        setFormError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match. Please re-check.");
        return;
      }
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const acceptRes = await fetch(`${apiUrl}/api/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          name: fullName.trim() || undefined,
          password: password || undefined,
          userId: session?.user?.id || undefined,
        }),
      });

      const acceptData = await acceptRes.json();
      if (!acceptRes.ok) {
        throw new Error(acceptData.message || "Failed to accept invitation.");
      }

      // Determine role configuration
      const roleKey = (verification.role || "").toUpperCase();
      const meta = ROLE_METADATA[roleKey] ?? ROLE_METADATA.SALES_REP!;

      // Update client role storage
      setStoredRole(meta.appRole);
      document.cookie = `demo_role=${meta.appRole}; path=/; max-age=86400; SameSite=Lax`;

      // Establish session if password was provided
      if (password) {
        try {
          await signIn.email({
            email: verification.email,
            password,
          });
        } catch (authErr) {
          console.warn("Client session sign-in fallback:", authErr);
        }
      }

      setSuccess(true);

      // Redirect after brief celebration
      setTimeout(() => {
        router.push(meta.redirect);
      }, 1200);
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred while accepting the invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const roleMeta = verification ? ROLE_METADATA[verification.role.toUpperCase()] ?? ROLE_METADATA.SALES_REP! : ROLE_METADATA.SALES_REP!;

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <BrandLogo href="/" as={Link} />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <span>Existing Account? Sign In</span>
          <ArrowRight size={13} />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[480px]">
          {/* LOADING STATE */}
          {isLoading && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#ff5e3a]/10 text-[#ff5e3a] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Validating Invitation</h2>
              <p className="text-xs text-slate-500 max-w-xs">
                Verifying cryptographic token security and workspace organization details...
              </p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && verificationError && (
            <div className="bg-white border border-red-200 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-4 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Invitation Unavailable</h2>
              <p className="text-xs text-slate-600 leading-relaxed bg-red-50 p-3.5 rounded-xl border border-red-100 w-full text-left">
                {verificationError}
              </p>
              <div className="flex flex-col w-full gap-2.5 mt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition text-center shadow-xs"
                >
                  Go to Sign In
                </Link>
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition text-center"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* SUCCESS TRANSITION STATE */}
          {success && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome to DealFlow360!
              </h2>
              <p className="text-xs text-slate-500 max-w-sm">
                You have successfully joined{" "}
                <span className="font-semibold text-slate-900">{verification?.organizationName}</span>.
                Preparing your workspace and redirecting...
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mt-2 bg-emerald-50 px-3 py-1.5 rounded-full">
                <Loader2 size={14} className="animate-spin" />
                <span>Redirecting to {roleMeta.label} Dashboard...</span>
              </div>
            </div>
          )}

          {/* ACTIVE INVITATION ACCEPT FORM */}
          {!isLoading && !verificationError && !success && verification && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col gap-6 animate-in fade-in duration-300">
              {/* Header Title */}
              <div className="flex flex-col gap-1 text-left border-b border-slate-100 pb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff5e3a] uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>Team Onboarding</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
                  Accept Team Invitation
                </h1>
                <p className="text-xs text-slate-500">
                  Configure your profile to join your team workspace on DealFlow360.
                </p>
              </div>

              {/* Organization & Role Callout Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff5e3a] text-white flex items-center justify-center shadow-xs">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Workspace Organization
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 block">
                        {verification.organizationName}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleMeta.badge}`}>
                    {roleMeta.label}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2.5">
                  {roleMeta.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Invited by <strong className="text-slate-700">{verification.invitedBy}</strong>
                  </span>
                  <span>
                    Valid until{" "}
                    <strong className="text-slate-700">
                      {new Date(verification.expiresAt).toLocaleDateString()}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form */}
              {isExistingUser ? (
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Signed in as {session?.user?.name || session?.user?.email}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Your authenticated session matches this invitation email. Click below to immediately activate your role and enter the workspace.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    className="mt-1 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Activating Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>1-Click Accept &amp; Enter Workspace</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                  {/* Email (Readonly) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Assigned Work Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={verification.email}
                        disabled
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-mono font-medium cursor-not-allowed"
                      />
                      <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="fullName">
                      Full Name <span className="text-[#ff5e3a]">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        id="fullName"
                        type="text"
                        required
                        placeholder="e.g. Alex Johnson"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-[#ff5e3a] focus:ring-1 focus:ring-[#ff5e3a] transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
                      Set Password <span className="text-[#ff5e3a]">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-[#ff5e3a] focus:ring-1 focus:ring-[#ff5e3a] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="confirmPassword">
                      Confirm Password <span className="text-[#ff5e3a]">*</span>
                    </label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-[#ff5e3a] focus:ring-1 focus:ring-[#ff5e3a] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full py-3 px-4 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold uppercase tracking-wider shadow-sm shadow-[#ff5e3a]/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup &amp; Join Workspace</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Footer Note */}
              <div className="text-center pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  By accepting this invitation, you agree to access guidelines established by{" "}
                  <span className="font-semibold text-slate-600">{verification.organizationName}</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center border-t border-slate-200/80 bg-white text-xs text-slate-400 font-medium">
        DealFlow360 Orchestration Platform &copy; 2026
      </footer>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
          <div className="p-8 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 text-xs font-semibold text-slate-600 shadow-sm">
            <Loader2 size={16} className="animate-spin text-[#ff5e3a]" />
            <span>Loading invitation details...</span>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

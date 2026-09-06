"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Zap,
  AlertCircle,
  ArrowLeft,
  Target,
  ShieldCheck,
  CreditCard,
  Users,
  Briefcase,
  Activity,
  CheckCircle2,
  Building,
  KeyRound,
  QrCode,
  Smartphone,
  MessageSquare,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Phone,
  ShieldAlert,
  Download,
} from "lucide-react";
import {
  useSession,
  signOut,
  sendVerificationEmail,
  twoFactor,
  fetch2FAStatus,
  sendWhatsAppVerificationOtp,
  confirmWhatsAppVerificationOtp,
  toggleWhatsApp2FA,
  type User2FAStatusResponse,
} from "../../lib/auth-client";
import { BrandLogo, SalesNav, AdminNav } from "@repo/ui";
import { getStoredRole, ROLES } from "../../lib/roles";
import { useQuotations, useMembers, useDealAnomalies, useCurrentOrg } from "../../lib/query";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [demoRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredRole();
    }
    return null;
  });

  const [verificationAlert, setVerificationAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        return {
          type: "success",
          message: "🎉 Email verified successfully! Your workspace account is now verified.",
        };
      }
    }
    return null;
  });

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState<User2FAStatusResponse>({
    totpEnabled: false,
    whatsappEnabled: false,
    whatsappPhoneNumber: null,
    whatsappVerified: false,
    maskedPhone: null,
  });
  const [loading2FA, setLoading2FA] = useState(false);
  const [twoFactorFeedback, setTwoFactorFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // TOTP Setup Modal State
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);
  const [totpStep, setTotpStep] = useState<"password" | "scan" | "backup">("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [totpSecretData, setTotpSecretData] = useState<{
    totpURI: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [totpSubmitting, setTotpSubmitting] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable TOTP State
  const [isDisableTotpOpen, setIsDisableTotpOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disablingTotp, setDisablingTotp] = useState(false);

  // WhatsApp 2FA Setup State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppPhoneInput, setWhatsAppPhoneInput] = useState("");
  const [whatsAppOtpInput, setWhatsAppOtpInput] = useState("");
  const [whatsAppStep, setWhatsAppStep] = useState<"input" | "verify">("input");
  const [whatsAppSubmitting, setWhatsAppSubmitting] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Queries
  const { data: quotes = [] } = useQuotations();
  const { data: members = [] } = useMembers();
  const { data: anomaliesData } = useDealAnomalies();
  const { data: org } = useCurrentOrg();

  // Load 2FA status from API
  const refresh2FA = async () => {
    if (!session?.user) return;
    setLoading2FA(true);
    try {
      const status = await fetch2FAStatus();
      setTwoFactorStatus(status);
      if (status.whatsappPhoneNumber) {
        setWhatsAppPhoneInput(status.whatsappPhoneNumber);
      }
    } catch (err) {
      console.warn("Failed to load 2FA status:", err);
    } finally {
      setLoading2FA(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      refresh2FA();
    }
  }, [session?.user]);

  // Resend OTP Countdown Timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("df360_user_role");
        document.cookie = "demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await signOut();
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!session?.user?.email) return;
    setSendingVerification(true);
    setVerificationAlert(null);

    try {
      await sendVerificationEmail({
        email: session.user.email,
        callbackURL: `${window.location.origin}/profile?verified=true`,
      });
      setVerificationAlert({
        type: "success",
        message: `✉️ Verification email sent to ${session.user.email}! Please check your inbox.`,
      });
    } catch (err) {
      setVerificationAlert({
        type: "error",
        message: (err as Error).message || "Failed to send verification email. Please try again.",
      });
    } finally {
      setSendingVerification(false);
    }
  };

  // --- TOTP Setup Handlers ---
  const handleStartTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setTotpSubmitting(true);

    try {
      const res = await twoFactor.enable({
        password: currentPassword,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to initiate Authenticator setup.");
      }

      if (res?.data && "totpURI" in res.data) {
        const rawUri = res.data.totpURI || "";
        let parsedSecret = (res.data as any).secret || "";
        if (!parsedSecret && rawUri.includes("secret=")) {
          try {
            parsedSecret = rawUri.split("secret=")[1]?.split("&")[0] || "";
          } catch {
            parsedSecret = "";
          }
        }

        setTotpSecretData({
          totpURI: rawUri,
          secret: parsedSecret,
          backupCodes: res.data.backupCodes || [],
        });
        setTotpStep("scan");
      } else {
        throw new Error("Unable to retrieve TOTP credentials from authentication server.");
      }
    } catch (err: any) {
      setTotpError(err.message || "Invalid password or unable to setup Authenticator.");
    } finally {
      setTotpSubmitting(false);
    }
  };

  const handleVerifyTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCodeInput || totpCodeInput.length !== 6) {
      setTotpError("Please enter the complete 6-digit code from your authenticator app.");
      return;
    }

    setTotpError(null);
    setTotpSubmitting(true);

    try {
      const res = await twoFactor.verifyTotp({
        code: totpCodeInput.trim(),
      });

      if (res?.error) {
        throw new Error(res.error.message || "Invalid authenticator code. Please try again.");
      }

      setTotpStep("backup");
      await refresh2FA();
      setTwoFactorFeedback({
        type: "success",
        message: "✅ Authenticator App (TOTP) 2FA successfully activated!",
      });
    } catch (err: any) {
      setTotpError(err.message || "Incorrect verification code. Please check your authenticator app.");
    } finally {
      setTotpSubmitting(false);
    }
  };

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setDisablingTotp(true);

    try {
      const res = await twoFactor.disable({
        password: disablePassword,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to disable 2FA.");
      }

      setIsDisableTotpOpen(false);
      setDisablePassword("");
      await refresh2FA();
      setTwoFactorFeedback({
        type: "success",
        message: "Authenticator App (TOTP) has been disabled.",
      });
    } catch (err: any) {
      setTotpError(err.message || "Incorrect password. Could not disable 2FA.");
    } finally {
      setDisablingTotp(false);
    }
  };

  // --- WhatsApp 2FA Handlers ---
  const handleSendWhatsAppOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setWhatsAppError(null);
    setWhatsAppSubmitting(true);

    try {
      await sendWhatsAppVerificationOtp(whatsAppPhoneInput);
      setWhatsAppStep("verify");
      setResendCountdown(60);
      setTwoFactorFeedback({
        type: "success",
        message: `💬 6-digit WhatsApp verification code sent to ${whatsAppPhoneInput}`,
      });
    } catch (err: any) {
      setWhatsAppError(err.message || "Failed to send WhatsApp verification code.");
    } finally {
      setWhatsAppSubmitting(false);
    }
  };

  const handleConfirmWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppOtpInput || whatsAppOtpInput.length !== 6) {
      setWhatsAppError("Please enter the 6-digit OTP code sent to your WhatsApp.");
      return;
    }

    setWhatsAppError(null);
    setWhatsAppSubmitting(true);

    try {
      await confirmWhatsAppVerificationOtp(whatsAppPhoneInput, whatsAppOtpInput.trim());
      setIsWhatsAppModalOpen(false);
      setWhatsAppOtpInput("");
      setWhatsAppStep("input");
      await refresh2FA();
      setTwoFactorFeedback({
        type: "success",
        message: "✅ WhatsApp 2FA successfully verified and activated!",
      });
    } catch (err: any) {
      setWhatsAppError(err.message || "Incorrect or expired WhatsApp OTP code.");
    } finally {
      setWhatsAppSubmitting(false);
    }
  };

  const handleToggleWhatsApp = async (enabled: boolean) => {
    setLoading2FA(true);
    try {
      await toggleWhatsApp2FA(enabled);
      await refresh2FA();
      setTwoFactorFeedback({
        type: "success",
        message: enabled ? "WhatsApp 2FA is now ENABLED." : "WhatsApp 2FA is now DISABLED.",
      });
    } catch (err: any) {
      setTwoFactorFeedback({
        type: "error",
        message: err.message || "Failed to toggle WhatsApp 2FA.",
      });
    } finally {
      setLoading2FA(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl max-w-md w-full text-center">
          <div className="w-8 h-8 border-3 border-[#ff5e3a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading profile and security settings...</p>
        </div>
      </div>
    );
  }

  if (!session?.user && !demoRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
        <header className="w-full border-b border-slate-200 bg-white/95 px-6 py-4 flex items-center justify-between">
          <BrandLogo href="/" />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xl max-w-md w-full text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold mb-4 border border-red-200">
              <AlertCircle size={14} />
              <span>No Active Session</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-sm text-slate-500 mb-6">
              You are currently signed out. Please sign in or create an account to view your workspace session.
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#ff5e3a] text-white font-semibold text-xs shadow-md shadow-[#ff5e3a]/25 hover:bg-[#ea4e28] transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Register
              </Link>
            </div>
          </div>
        </main>
        <footer className="w-full py-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400">
          DealFlow 360 Orchestration Platform &copy; 2026
        </footer>
      </div>
    );
  }

  const user = session?.user || {
    id: "demo-" + Math.random().toString(36).substring(7),
    name: ROLES[demoRole as keyof typeof ROLES]?.defaultName || "Workspace User",
    email: ROLES[demoRole as keyof typeof ROLES]?.defaultEmail || "user@dealflow360.com",
    emailVerified: false,
  };

  const isDemo = !session?.user;
  const initials = user.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const renderTopNav = () => {
    if (demoRole === "admin") {
      return (
        <AdminNav
          currentPath="/profile"
          adminName={user.name || "Admin"}
          adminEmail={user.email}
          adminInitials={initials}
          orgName={org?.name || "Acme Corp"}
          onSignOut={handleSignOut}
          linkComponent={Link as any}
        />
      );
    }

    if (demoRole === "sales_rep" || demoRole === "manager" || demoRole === "finance") {
      let roleLabel = "Sales Rep";
      if (demoRole === "manager") roleLabel = "Manager";
      if (demoRole === "finance") roleLabel = "Finance Ops";

      return (
        <SalesNav
          activeTab={undefined as any}
          userName={user.name || "User"}
          userInitials={initials}
          roleLabel={roleLabel}
          onSignOut={handleSignOut}
          linkComponent={Link as any}
        />
      );
    }

    return (
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <BrandLogo href="/dashboard" subtitle="Profile & Security" />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Workspace</span>
        </Link>
      </header>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {renderTopNav()}

      <main className="max-w-6xl mx-auto w-full px-4 pt-24 pb-8 sm:pt-28 sm:pb-12 flex-1">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Profile & Security Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your credentials, organization roles, and multi-factor security preferences
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh2FA}
              disabled={loading2FA}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading2FA ? "animate-spin" : ""} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {twoFactorFeedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs font-semibold border flex items-center justify-between shadow-xs ${
              twoFactorFeedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{twoFactorFeedback.message}</span>
            <button
              onClick={() => setTwoFactorFeedback(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-4 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Core Identity */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-24 h-24 rounded-full bg-[#ff5e3a] text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-[#ff5e3a]/25 relative">
                  {initials}
                  <div className="absolute bottom-0 right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">{user.name || "Workspace User"}</h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    isDemo
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-100 text-emerald-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isDemo ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  ></span>
                  <span>{isDemo ? "Demo Session" : "Better Auth Session"}</span>
                </div>
              </div>

              {verificationAlert && (
                <div
                  className={`mt-6 p-4 rounded-xl text-xs border ${
                    verificationAlert.type === "error"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  {verificationAlert.message}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    User ID
                  </span>
                  <span className="text-xs font-mono text-slate-800 break-all bg-slate-50 p-2 rounded-lg block border border-slate-100">
                    {user.id}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Email Status
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        user.emailVerified
                          ? "text-emerald-600 flex items-center gap-1"
                          : "text-amber-600"
                      }`}
                    >
                      {user.emailVerified && <CheckCircle2 size={14} />}
                      {user.emailVerified ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                  {!user.emailVerified && !isDemo && (
                    <button
                      type="button"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                      className="px-3 py-1.5 rounded-lg bg-[#ff5e3a] text-white text-xs font-semibold hover:bg-[#ea4e28] transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingVerification ? "Sending..." : "Verify"}
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Assigned Role
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold uppercase border border-slate-200">
                    {demoRole || "Standard User"}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Two-Factor Authentication & Security */}
          <div className="lg:col-span-2 space-y-6">
            {/* 2FA Master Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#ff5e3a]/10 text-[#ff5e3a] flex items-center justify-center font-bold">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Protect your account with a mandatory second factor during sign-in
                    </p>
                  </div>
                </div>

                <div>
                  {twoFactorStatus.totpEnabled && twoFactorStatus.whatsappEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <ShieldCheck size={14} />
                      <span>TOTP + WhatsApp Active</span>
                    </span>
                  ) : twoFactorStatus.totpEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                      <Smartphone size={14} />
                      <span>TOTP Active</span>
                    </span>
                  ) : twoFactorStatus.whatsappEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <MessageSquare size={14} />
                      <span>WhatsApp Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <ShieldAlert size={14} className="text-slate-400" />
                      <span>2FA Disabled</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 2FA Option 1: Authenticator App (TOTP) */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Authenticator App (TOTP)
                      </h4>
                      {twoFactorStatus.totpEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Use Google Authenticator, Microsoft Authenticator, 1Password, or Authy to generate time-based 6-digit codes.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {twoFactorStatus.totpEnabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDisableTotpOpen(true);
                        setTotpError(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      Disable TOTP
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTotpModalOpen(true);
                        setTotpStep("password");
                        setCurrentPassword("");
                        setTotpError(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-[#0066cc]/20 transition cursor-pointer"
                    >
                      Setup Authenticator
                    </button>
                  )}
                </div>
              </div>

              {/* 2FA Option 2: Meta WhatsApp Business Cloud API OTP */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Meta WhatsApp OTP (2FA)
                      </h4>
                      {twoFactorStatus.whatsappEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      ) : twoFactorStatus.whatsappVerified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          VERIFIED (OFF)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          UNLINKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Receive an instant 6-digit OTP code directly to your WhatsApp via Meta Cloud API during login.
                    </p>
                    {twoFactorStatus.whatsappPhoneNumber && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-800">
                        <Phone size={13} />
                        <span>Registered: {twoFactorStatus.maskedPhone || twoFactorStatus.whatsappPhoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {twoFactorStatus.whatsappVerified ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleWhatsApp(!twoFactorStatus.whatsappEnabled)}
                        disabled={loading2FA}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          twoFactorStatus.whatsappEnabled
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        }`}
                      >
                        {twoFactorStatus.whatsappEnabled ? "Disable WhatsApp" : "Enable WhatsApp"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsWhatsAppModalOpen(true);
                          setWhatsAppStep("input");
                          setWhatsAppError(null);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                        title="Change Phone Number"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsWhatsAppModalOpen(true);
                        setWhatsAppStep("input");
                        setWhatsAppError(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      Connect WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {/* Security Policy Information */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <KeyRound size={15} className="text-[#ff5e3a]" />
                  <span>Two-Factor Authentication Sign-In Rule</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  When 2FA is active on your profile, entering your password alone will not sign you into DealFlow 360.
                  You must complete the verification step via your Authenticator app or WhatsApp OTP. If both are enabled, you can choose whichever factor is most convenient.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- MODAL 1: SETUP TOTP AUTHENTICATOR --- */}
        {isTotpModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <QrCode size={18} className="text-[#0066cc]" />
                  <span>Setup Authenticator App</span>
                </div>
                <button
                  onClick={() => setIsTotpModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {totpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{totpError}</span>
                </div>
              )}

              {/* Step 1: Password Confirmation */}
              {totpStep === "password" && (
                <form onSubmit={handleStartTotpSetup} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    To start setting up two-factor authentication, please re-enter your current account password.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#0066cc]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsTotpModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={totpSubmitting || !currentPassword}
                      className="px-5 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold hover:bg-[#0052a3] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {totpSubmitting && <Loader2 size={13} className="animate-spin" />}
                      <span>Continue</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Scan QR Code and Verify OTP */}
              {totpStep === "scan" && totpSecretData && (
                <form onSubmit={handleVerifyTotpSetup} className="space-y-4 text-center">
                  <p className="text-xs text-slate-600">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                  </p>

                  {/* QR Code */}
                  <div className="flex justify-center p-3 bg-white border border-slate-200 rounded-xl max-w-[200px] mx-auto shadow-2xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        totpSecretData.totpURI
                      )}`}
                      alt="TOTP QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>

                  {/* Secret Key String */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Manual Secret Key
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                        {totpSecretData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(totpSecretData.secret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedSecret ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedSecret ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Input */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Enter 6-Digit Authenticator Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={totpCodeInput}
                      onChange={(e) => setTotpCodeInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="000000"
                      className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0066cc] outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsTotpModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={totpSubmitting || totpCodeInput.length !== 6}
                      className="px-5 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold hover:bg-[#0052a3] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {totpSubmitting && <Loader2 size={13} className="animate-spin" />}
                      <span>Verify & Activate</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Backup Codes Display */}
              {totpStep === "backup" && totpSecretData && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <span>⚠️ Save Your Backup Recovery Codes</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      If you ever lose access to your authenticator app, these one-time recovery codes are the only way to sign into your account.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 text-center">
                    {totpSecretData.backupCodes.map((code, idx) => (
                      <span key={idx} className="p-1.5 bg-white border border-slate-200 rounded font-bold">
                        {code}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const content = totpSecretData.backupCodes.join("\n");
                        const blob = new Blob([content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "dealflow360-backup-codes.txt";
                        a.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTotpModalOpen(false);
                        setCurrentPassword("");
                        setTotpCodeInput("");
                        setTotpSecretData(null);
                        setTotpStep("password");
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- MODAL 2: DISABLE TOTP --- */}
        {isDisableTotpOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Disable Authenticator 2FA</h3>
                <button
                  onClick={() => setIsDisableTotpOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {totpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {totpError}
                </div>
              )}

              <form onSubmit={handleDisableTotp} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Please enter your account password to confirm disabling TOTP authentication:
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Account Password
                  </label>
                  <input
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDisableTotpOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disablingTotp || !disablePassword}
                    className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {disablingTotp && <Loader2 size={13} className="animate-spin" />}
                    <span>Confirm Disable</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL 3: SETUP WHATSAPP 2FA --- */}
        {isWhatsAppModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <MessageSquare size={18} className="text-emerald-600" />
                  <span>Connect WhatsApp for 2FA</span>
                </div>
                <button
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {whatsAppError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{whatsAppError}</span>
                </div>
              )}

              {/* Step 1: Input Phone Number */}
              {whatsAppStep === "input" && (
                <form onSubmit={handleSendWhatsAppOtp} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your international WhatsApp phone number. We will send a 6-digit verification code using Meta Cloud API.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      WhatsApp Phone Number (E.164 Format)
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={whatsAppPhoneInput}
                        onChange={(e) => setWhatsAppPhoneInput(e.target.value)}
                        placeholder="+1 (555) 019-2834 or +91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Include country code (e.g. +1 for US/CA, +91 for India, +44 for UK).
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWhatsAppModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={whatsAppSubmitting || !whatsAppPhoneInput}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {whatsAppSubmitting && <Loader2 size={13} className="animate-spin" />}
                      <span>Send WhatsApp OTP</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify WhatsApp OTP */}
              {whatsAppStep === "verify" && (
                <form onSubmit={handleConfirmWhatsAppOtp} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                    <p>We sent a 6-digit OTP code to <strong>{whatsAppPhoneInput}</strong> via WhatsApp.</p>
                    <p className="text-[11px] text-emerald-600 font-medium">💡 In development mode, the OTP code is also printed directly to your API server terminal.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Enter 6-Digit WhatsApp OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={whatsAppOtpInput}
                      onChange={(e) => setWhatsAppOtpInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="000000"
                      className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setWhatsAppStep("input")}
                      className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      &larr; Edit Number
                    </button>

                    <button
                      type="button"
                      disabled={resendCountdown > 0 || whatsAppSubmitting}
                      onClick={() => handleSendWhatsAppOtp()}
                      className="text-emerald-700 hover:text-emerald-900 font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWhatsAppModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={whatsAppSubmitting || whatsAppOtpInput.length !== 6}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {whatsAppSubmitting && <Loader2 size={13} className="animate-spin" />}
                      <span>Verify & Enable</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400">
        DealFlow 360 Orchestration Platform &copy; 2026
      </footer>
    </div>
  );
}

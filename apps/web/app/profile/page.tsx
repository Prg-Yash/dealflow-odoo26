"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home, Zap, AlertCircle, ArrowLeft } from "lucide-react";
import { useSession, signOut, sendVerificationEmail } from "../../lib/auth-client";
import { BrandLogo } from "@repo/ui";
import { getStoredRole, ROLES } from "../../lib/roles";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [demoRole, setDemoRole] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDemoRole(getStoredRole());
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      // Clear demo role from localStorage & cookies
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
        message: `✉️ Verification email sent to ${session.user.email}! Please check your inbox (or terminal console).`,
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

  const handleTriggerComputeJob = async () => {
    setTriggeringJob(true);
    setJobStatus(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/jobs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskType: "matrix-multiplication",
          matrixSize: 128,
          iterations: 25,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setJobStatus(`Job #${data.job?.id || "N/A"} enqueued for 24/7 background worker!`);
      } else {
        setJobStatus(`Error: ${data.message || "Failed to trigger job"}`);
      }
    } catch (err) {
      setJobStatus(`Connection Error: ${(err as Error).message}`);
    } finally {
      setTriggeringJob(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl max-w-md w-full text-center">
          <div className="w-8 h-8 border-3 border-[#ff5e3a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading session from standalone API...</p>
        </div>
      </div>
    );
  }

  // If there's no session AND no demo role
  if (!session?.user && !demoRole) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
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
          DealFlow360 Orchestration Platform &copy; 2025
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

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#0f172a] font-sans antialiased flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <BrandLogo href="/dashboard" subtitle="Profile & Session" />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={14} />
          <span>To Dashboard</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex-1">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/40">
          {/* Avatar & User Details */}
          <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-[#ff5e3a] text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-[#ff5e3a]/25 shrink-0">
              {initials}
            </div>
            <div className="space-y-1">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isDemo ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDemo ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                <span>{isDemo ? 'Demo Session (Mocked Role)' : 'Better Auth Session Active'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{user.name || "Workspace User"}</h1>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          {/* Verification Alert */}
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

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                User ID
              </span>
              <span className="text-xs font-mono text-slate-800 break-all">{user.id}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Email Status
                </span>
                <span className={`text-xs font-semibold ${user.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                  {user.emailVerified ? "Verified ✓" : "Pending Verification"}
                </span>
              </div>
              {!user.emailVerified && !isDemo && (
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={sendingVerification}
                  className="px-3 py-1 rounded-lg bg-[#ff5e3a] text-white text-xs font-semibold hover:bg-[#ea4e28] transition cursor-pointer disabled:opacity-50"
                >
                  {sendingVerification ? "Sending..." : "Verify"}
                </button>
              )}
            </div>
          </div>

          {/* Job trigger & actions */}
          {jobStatus && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              {jobStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTriggerComputeJob}
              disabled={triggeringJob}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-xs shadow-md shadow-[#ff5e3a]/25 transition cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} />
              <span>{triggeringJob ? "Triggering..." : "Trigger Background Compute"}</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              <Home size={14} />
              <span>Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition cursor-pointer ml-auto"
            >
              <LogOut size={14} />
              <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400">
        DealFlow360 Orchestration Platform &copy; 2025
      </footer>
    </div>
  );
}

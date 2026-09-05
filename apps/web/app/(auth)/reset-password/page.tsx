"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { AuthCard, useToast } from "@repo/ui";
import { isValidPassword } from "../../../lib/validation";

type TokenStatus = "VERIFYING" | "VALID" | "USED_OR_EXPIRED" | "SUBMITTED";

export default function ResetPasswordPage() {
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("VERIFYING");
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string>("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;
  const confirmError = confirmTouched && password !== confirmPassword ? "Passwords do not match." : null;
  const isFormValid = isValidPassword(password) && password === confirmPassword;

  // 1. Strict Server Verification on Mount (Default-Deny Security Model)
  useEffect(() => {
    async function checkToken() {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      const urlToken = params.get("token")?.trim();

      // If URL explicitly indicates expired or already used
      if (params.get("expired") === "true") {
        setTokenStatus("USED_OR_EXPIRED");
        setTokenErrorMessage("This password reset link has already been used and is expired.");
        return;
      }

      if (urlError === "INVALID_TOKEN") {
        setTokenStatus("USED_OR_EXPIRED");
        setTokenErrorMessage("This password reset link is invalid or has expired. Please request a new recovery link.");
        return;
      }

      if (!urlToken) {
        setTokenStatus("USED_OR_EXPIRED");
        setTokenErrorMessage("Missing password reset token. Please request a new password recovery link.");
        return;
      }

      // Check if this token was already marked as used in this browser session
      try {
        if (sessionStorage.getItem(`used_token_${urlToken}`)) {
          setTokenStatus("USED_OR_EXPIRED");
          setTokenErrorMessage("This password reset link has already been used to change your password.");
          return;
        }
      } catch {}

      setToken(urlToken);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        // Pass timestamp cache-buster to completely prevent 304 / cached responses
        const res = await fetch(
          `${apiUrl}/api/auth/verify-reset-token?token=${encodeURIComponent(urlToken)}&_t=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              "Pragma": "no-cache",
            },
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.valid) {
          const message = data.message || "This password reset link has already been used or has expired.";
          setTokenStatus("USED_OR_EXPIRED");
          setTokenErrorMessage(message);
          toast.error("Reset Link Inactive", message);
          return;
        }

        // Only switch to VALID if the backend explicitly confirmed the token is active in the database
        setTokenStatus("VALID");
      } catch (err) {
        console.warn("Could not reach token verification API:", err);
        // Default-Deny: If verification fails, never expose the password creation form
        setTokenStatus("USED_OR_EXPIRED");
        setTokenErrorMessage("Unable to verify reset token or the link has already expired. Please request a new recovery link.");
      }
    }

    checkToken();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) {
      setPasswordTouched(true);
      setConfirmTouched(true);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
          newPassword: password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.message || "Failed to reset password.";
        // If the token was already consumed or expired
        if (
          data.error === "INVALID_OR_USED_TOKEN" ||
          data.error === "EXPIRED_TOKEN" ||
          res.status === 400
        ) {
          setTokenStatus("USED_OR_EXPIRED");
          setTokenErrorMessage(errorMsg);
        }
        throw new Error(errorMsg);
      }

      // Mark token as used in session storage
      try {
        sessionStorage.setItem(`used_token_${token}`, "true");
      } catch {}

      // Scrub token from URL so refreshing or back-navigating lands on expired state
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/reset-password?expired=true");
      }

      toast.success(
        "Password Updated",
        "Your password has been changed. This recovery token is now permanently expired."
      );
      setTokenStatus("SUBMITTED");
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please check requirements or request a new link.");
      toast.error("Reset Failed", err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create New Password"
      description="Enter and confirm your new account password below."
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Remember your old credentials?{" "}
            <Link href="/login" className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5">
              Log In
            </Link>
          </p>
        </div>
      }
    >
      {/* 1. Verifying Token State */}
      {tokenStatus === "VERIFYING" && (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 size={24} className="text-[#ff5e3a] animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Verifying security token...</p>
        </div>
      )}

      {/* 2. Token Expired or Already Used State - Strict Zero UI Leakage */}
      {tokenStatus === "USED_OR_EXPIRED" && (
        <div className="flex flex-col gap-4 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <ShieldAlert size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-950 leading-tight">Link Expired or Already Used</h4>
              <p className="text-[11px] text-amber-800 font-medium mt-1 leading-relaxed">
                {tokenErrorMessage || "This password reset link has already been used or has expired."}
              </p>
              <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
                For security reasons, password recovery links are strictly single-use only and automatically expire once password change is finalized.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <Link
              href="/forgot-password"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <span>Request New Reset Link</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <span>Back to Log In</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Password Successfully Changed State */}
      {tokenStatus === "SUBMITTED" && (
        <div className="flex flex-col gap-4 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-emerald-950 leading-tight">Password Successfully Updated</h4>
              <p className="text-[11px] text-emerald-800 font-medium mt-1 leading-relaxed">
                Your credentials have been securely updated. This password reset token has been permanently retired and cannot be reused.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 cursor-pointer"
          >
            <span>Proceed to Log In</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* 4. Active Create Password Form - Only visible when token is explicitly confirmed VALID */}
      {tokenStatus === "VALID" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="newPassword">
              New Password <span className="text-[#ff5e3a]">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordTouched(true);
                  if (error) setError(null);
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && <span className="text-[11px] text-red-500 font-medium">{passwordError}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="confirmPassword">
              Confirm New Password <span className="text-[#ff5e3a]">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmTouched(true);
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
                className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                  confirmError
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                }`}
              />
            </div>
            {confirmError && <span className="text-[11px] text-red-500 font-medium">{confirmError}</span>}
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
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
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

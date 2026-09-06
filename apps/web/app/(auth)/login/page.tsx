"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AuthCard, useToast } from "@repo/ui";
import {
  signIn,
  twoFactor,
  check2FALoginRequirement,
  sendLoginWhatsAppOtp,
  verifyLoginWhatsAppOtp,
  type Check2FAResponse,
} from "../../../lib/auth-client";
import { inferRoleFromEmail, getRoleRedirect, setStoredRole, type UserRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword } from "../../../lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Credentials State (Step 1)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [activePill, setActivePill] = useState<string | null>(null);

  // 2FA Challenge State (Step 2)
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [challengeData, setChallengeData] = useState<Check2FAResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"totp" | "whatsapp" | "backup">("totp");
  const [otpInput, setOtpInput] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sendingWhatsAppOtp, setSendingWhatsAppOtp] = useState(false);

  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  // Resend Countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleFieldChange = (field: "email" | "password", value: string) => {
    if (field === "email") {
      setEmail(value);
      setEmailTouched(true);
    } else {
      setPassword(value);
      setPasswordTouched(true);
    }
    if (error || authFailed) {
      setError(null);
      setAuthFailed(false);
    }
  };

  const handleSelectTestRole = (id: string, label: string, testEmail: string) => {
    setActivePill(id);
    setEmail(testEmail);
    setPassword("Password123!");
    setEmailTouched(true);
    setPasswordTouched(true);
    setError(null);
    setAuthFailed(false);
    toast.info(
      "Test Credentials Loaded",
      `Filled demo credentials for ${label} (${testEmail}). Click "Log In" to proceed.`
    );
  };

  // Step 1: Initial Login Form Submission
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setAuthFailed(false);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if user has 2FA enabled before completing login
      let twoFactorInfo: Check2FAResponse | null = null;
      try {
        twoFactorInfo = await check2FALoginRequirement(normalizedEmail);
      } catch {
        // User not found or endpoint check
      }

      // If user has 2FA enabled (either TOTP or WhatsApp)
      if (twoFactorInfo && twoFactorInfo.requires2FA) {
        // Attempt sign in with Better Auth to validate password
        const signInRes = await signIn.email({
          email: normalizedEmail,
          password,
        });

        if (signInRes?.error && signInRes.error.code !== "TWO_FACTOR_REQUIRED") {
          const errMsg = signInRes.error.message || "Invalid email or password.";
          setError(errMsg);
          setAuthFailed(true);
          setLoading(false);
          return;
        }

        // Credentials are valid! Transition to Step 2
        setChallengeData(twoFactorInfo);
        setIs2FAStep(true);
        setOtpInput("");

        // Select initial method
        if (twoFactorInfo.totpEnabled) {
          setSelectedMethod("totp");
        } else if (twoFactorInfo.whatsappEnabled) {
          setSelectedMethod("whatsapp");
          // Auto-send WhatsApp OTP
          await handleTriggerWhatsAppOtp(twoFactorInfo.userId);
        }

        setLoading(false);
        return;
      }

      // No 2FA enabled: Proceed with standard direct login
      const res = await signIn.email({
        email: normalizedEmail,
        password,
      });

      if (res?.error) {
        // If Better Auth rejected because TOTP plugin is active
        if (res.error.code === "TWO_FACTOR_REQUIRED" || (res.data as any)?.twoFactorRedirect) {
          const statusInfo = await check2FALoginRequirement(normalizedEmail).catch(() => null);
          setChallengeData(
            statusInfo || {
              requires2FA: true,
              userId: "",
              email: normalizedEmail,
              name: "User",
              totpEnabled: true,
              whatsappEnabled: false,
              maskedPhone: null,
            }
          );
          setIs2FAStep(true);
          setSelectedMethod("totp");
          setLoading(false);
          return;
        }

        const errMsg = res.error.message || "Invalid email or password.";
        setError(errMsg);
        setAuthFailed(true);
        toast.error("Authentication Failed", errMsg);
        setLoading(false);
        return;
      }

      // Login Successful! Finalize session & route
      await finalizeLoginAndRedirect(normalizedEmail);
    } catch (err: any) {
      console.error("Login submission error:", err);
      const errMsg = err?.message || "Invalid email or password. Please check your credentials.";
      setError(errMsg);
      setAuthFailed(true);
      toast.error("Sign In Error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Triggers sending WhatsApp OTP during login
  const handleTriggerWhatsAppOtp = async (userIdToUse?: string) => {
    const targetUserId = userIdToUse || challengeData?.userId;
    if (!targetUserId) return;

    setSendingWhatsAppOtp(true);
    try {
      await sendLoginWhatsAppOtp(targetUserId);
      setResendCountdown(60);
      toast.success(
        "WhatsApp OTP Dispatched",
        `A 6-digit verification code was sent to ${challengeData?.maskedPhone || "your WhatsApp"}.`
      );
    } catch (err: any) {
      toast.error("WhatsApp Dispatch Failed", err.message || "Could not deliver OTP.");
    } finally {
      setSendingWhatsAppOtp(false);
    }
  };

  // Step 2: Verify 2FA Code
  const handleVerify2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setError(null);
    setVerifying2FA(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (selectedMethod === "totp") {
        // Verify via Better Auth TOTP Plugin
        const res = await twoFactor.verifyTotp({
          code: otpInput.trim(),
        });

        if (res?.error) {
          throw new Error(res.error.message || "Invalid authenticator code. Please try again.");
        }
      } else if (selectedMethod === "backup") {
        // Verify via Backup Recovery Code
        const res = await twoFactor.verifyBackupCode({
          code: otpInput.trim(),
        });

        if (res?.error) {
          throw new Error(res.error.message || "Invalid or already used backup code.");
        }
      } else if (selectedMethod === "whatsapp") {
        // Verify via Meta WhatsApp Cloud API OTP
        if (!challengeData?.userId) {
          throw new Error("Missing 2FA challenge context. Please restart login.");
        }

        await verifyLoginWhatsAppOtp(challengeData.userId, otpInput.trim());
      }

      toast.success("Two-Factor Verified", "Security check passed. Access granted!");
      await finalizeLoginAndRedirect(normalizedEmail);
    } catch (err: any) {
      console.error("2FA Verification error:", err);
      const errMsg = err.message || "Invalid verification code. Please check and try again.";
      setError(errMsg);
      toast.error("2FA Verification Failed", errMsg);
    } finally {
      setVerifying2FA(false);
    }
  };

  // Helper: Fetches user role from /api/auth/me and redirects to the appropriate dashboard
  const finalizeLoginAndRedirect = async (normalizedEmail: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let userRole: UserRole = "sales_rep";

    try {
      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: "include",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const dbRole = meData?.user?.role;
        if (dbRole === "ADMIN") userRole = "admin";
        else if (dbRole === "SALES_MANAGER") userRole = "manager";
        else if (dbRole === "SALES_REP") userRole = "sales_rep";
        else if (dbRole === "FINANCE_OPS") userRole = "finance";
        else if (dbRole === "CUSTOMER") userRole = "customer";
        else userRole = inferRoleFromEmail(normalizedEmail);
      } else {
        userRole = inferRoleFromEmail(normalizedEmail);
      }
    } catch {
      userRole = inferRoleFromEmail(normalizedEmail);
    }

    setStoredRole(userRole);
    document.cookie = `demo_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
    router.push(getRoleRedirect(userRole));
  };

  return (
    <AuthCard
      title={is2FAStep ? "Two-Factor Verification" : "Welcome Back"}
      description={
        is2FAStep
          ? "Verify your identity to complete sign in"
          : "Sign in to orchestrate deals, approvals & revenue"
      }
      activeTab="login"
      linkComponent={Link}
      footerNote={
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5"
            >
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      {/* ── STEP 2: TWO-FACTOR AUTHENTICATION CHALLENGE ── */}
      {is2FAStep ? (
        <div className="space-y-5 text-left">
          {/* Method Selection (If both TOTP and WhatsApp are available) */}
          {challengeData?.totpEnabled && challengeData?.whatsappEnabled && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("totp");
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMethod === "totp" || selectedMethod === "backup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone size={14} className="text-[#0066cc]" />
                <span>Authenticator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("whatsapp");
                  setError(null);
                  if (resendCountdown === 0) {
                    handleTriggerWhatsAppOtp();
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMethod === "whatsapp"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare size={14} className="text-emerald-600" />
                <span>WhatsApp OTP</span>
              </button>
            </div>
          )}

          {/* Form Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
            {selectedMethod === "whatsapp" ? (
              <MessageSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : selectedMethod === "backup" ? (
              <KeyRound size={16} className="text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Smartphone size={16} className="text-[#0066cc] shrink-0 mt-0.5" />
            )}

            <div>
              <p className="font-semibold text-slate-800">
                {selectedMethod === "whatsapp"
                  ? `Enter WhatsApp OTP Code`
                  : selectedMethod === "backup"
                  ? "Enter 8-Character Backup Code"
                  : "Enter Authenticator App Code"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {selectedMethod === "whatsapp"
                  ? `Sent to your verified WhatsApp: ${challengeData?.maskedPhone || "Registered Number"}`
                  : selectedMethod === "backup"
                  ? "Use one of your saved single-use recovery codes."
                  : "Open Google Authenticator, Authy, or 1Password and enter the current 6-digit code."}
              </p>
              {selectedMethod === "whatsapp" && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                  💡 In dev mode, the OTP code is also logged directly in your API terminal.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify2FACode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {selectedMethod === "backup" ? "Backup Recovery Code" : "6-Digit Security Code"}
              </label>
              <input
                type="text"
                autoFocus
                maxLength={selectedMethod === "backup" ? 16 : 6}
                required
                value={otpInput}
                onChange={(e) =>
                  setOtpInput(
                    selectedMethod === "backup"
                      ? e.target.value.toUpperCase()
                      : e.target.value.replace(/[^0-9]/g, "")
                  )
                }
                placeholder={selectedMethod === "backup" ? "ABCD-1234" : "000000"}
                className="w-full text-center tracking-widest text-xl font-mono font-black py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 outline-none transition"
              />
            </div>

            {/* WhatsApp Resend Link */}
            {selectedMethod === "whatsapp" && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-400">Didn&apos;t receive WhatsApp code?</span>
                <button
                  type="button"
                  disabled={resendCountdown > 0 || sendingWhatsAppOtp}
                  onClick={() => handleTriggerWhatsAppOtp()}
                  className="font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  {sendingWhatsAppOtp ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  <span>
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                  </span>
                </button>
              </div>
            )}

            {/* TOTP / Backup Code Switcher */}
            {challengeData?.totpEnabled && selectedMethod !== "whatsapp" && (
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod(selectedMethod === "totp" ? "backup" : "totp");
                    setOtpInput("");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-[#0066cc] font-medium transition cursor-pointer"
                >
                  {selectedMethod === "totp"
                    ? "Lost access to authenticator? Use a Backup Code"
                    : "← Back to Authenticator App (TOTP)"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying2FA || !otpInput.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {verifying2FA ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              <span>Verify & Continue</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIs2FAStep(false);
                setOtpInput("");
                setError(null);
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Login</span>
            </button>
          </form>
        </div>
      ) : (
        /* ── STEP 1: CREDENTIALS (EMAIL + PASSWORD) ── */
        <form onSubmit={handleSubmitCredentials} className="flex flex-col gap-3.5 text-left">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-wider text-slate-600"
              htmlFor="userEmail"
            >
              Email Address <span className="text-[#ff5e3a]">*</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="userEmail"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                placeholder="name@company.com"
                className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                  emailError
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : authFailed
                    ? "border-red-300 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                    : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                }`}
              />
            </div>
            {emailError && <span className="text-[11px] text-red-500 font-medium">{emailError}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
                htmlFor="userPassword"
              >
                Password <span className="text-[#ff5e3a]">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-slate-500 hover:text-[#ff5e3a] transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="userPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                placeholder="••••••••••••"
                className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 transition-all outline-none border ${
                  authFailed
                    ? "bg-red-50/40 border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : passwordError
                    ? "bg-[#f8fafc] border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "bg-[#f8fafc] border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && (
              <span className="text-[11px] text-red-500 font-medium">{passwordError}</span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white text-xs font-bold shadow-md shadow-[#ff5e3a]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            <span>{loading ? "Signing in..." : "Log In to Workspace"}</span>
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Fast Demo Logins (Password: Password123!)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "cust", label: "Customer Portal", email: "apex-tech.procurement@acmecorp.com" },
                { id: "cust-cobalt", label: "Customer (DF-Q1042)", email: "apex-tech.soc@cobaltcyber.com" },
                { id: "rep", label: "Sales Rep", email: "rep@dealflow360.com" },
                { id: "mgr", label: "Sales Manager", email: "manager@dealflow360.com" },
                { id: "fin", label: "Finance Ops", email: "finance@dealflow360.com" },
                { id: "adm", label: "Admin", email: "admin@dealflow360.com" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTestRole(item.id, item.label, item.email)}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition cursor-pointer ${
                    activePill === item.id
                      ? "bg-orange-50 border-[#ff5e3a] text-[#ff5e3a] font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold text-[11px] leading-tight">{item.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">{item.email}</div>
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </AuthCard>
  );
}

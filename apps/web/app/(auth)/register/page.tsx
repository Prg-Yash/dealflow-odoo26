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
  Building2,
  Lock,
  Phone,
  Coins,
  ShieldCheck,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { AuthCard, useToast } from "@repo/ui";
import { signIn } from "../../../lib/auth-client";
import { setStoredRole } from "../../../lib/roles";
import { isValidEmail, isValidPassword, isValidName } from "../../../lib/validation";

type SignupMode = "customer" | "admin";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Mode state: default is "customer"
  const [mode, setMode] = useState<SignupMode>("customer");

  // Read optional initial mode from URL search param e.g. /register?mode=admin
  useEffect(() => {
    const requestedMode = searchParams.get("mode") || searchParams.get("role");
    if (requestedMode === "admin") {
      setMode("admin");
    } else {
      setMode("customer");
    }
  }, [searchParams]);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Field Touched State
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [companyTouched, setCompanyTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Loading and Error State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation Rules
  const nameError = nameTouched && !isValidName(fullName) ? "Name must be at least 2 characters." : null;
  const emailError = emailTouched && !isValidEmail(email) ? "Please enter a valid email address." : null;
  const companyError =
    mode === "admin" && companyTouched && !isValidName(companyName)
      ? "Organization name must be at least 2 characters."
      : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? "Password must be at least 8 characters." : null;

  const isFormValid =
    isValidName(fullName) &&
    isValidEmail(email) &&
    (mode === "customer" || isValidName(companyName)) &&
    isValidPassword(password);

  const toggleMode = () => {
    setError(null);
    setMode((prev) => (prev === "customer" ? "admin" : "customer"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setNameTouched(true);
      setEmailTouched(true);
      if (mode === "admin") setCompanyTouched(true);
      setPasswordTouched(true);
      return;
    }

    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    try {
      if (mode === "customer") {
        // 1. Call Backend Customer Registration API
        const res = await fetch(`${apiUrl}/api/customer/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            companyName: companyName.trim() || undefined,
            phone: phone.trim() || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || data.error || "Customer registration failed. Please try again.");
        }

        // 2. Sign in with Better Auth credentials to establish active browser session
        try {
          await signIn.email({
            email: email.trim().toLowerCase(),
            password,
          });
        } catch (authErr) {
          console.warn("Sign-in session note:", authErr);
        }

        toast.success(
          "Account Created",
          "Welcome to the DealFlow 360 Customer Portal!"
        );

        // 3. Set stored role to customer and redirect to customer portal
        document.cookie = `demo_role=customer; path=/; max-age=86400; SameSite=Lax`;
        setStoredRole("customer");
        router.push("/portal");
      } else {
        // Admin Mode: Call Backend Admin Registration API
        const res = await fetch(`${apiUrl}/api/admin/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            organizationName: companyName.trim() || "Apex Enterprise Technologies Inc",
            currency: currency || "INR",
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || data.error || "Admin workspace creation failed. Please try again.");
        }

        try {
          await signIn.email({
            email: email.trim().toLowerCase(),
            password,
          });
        } catch (authErr) {
          console.warn("Admin sign-in session note:", authErr);
        }

        toast.success(
          "Workspace Created",
          "Welcome to your Admin Workspace!"
        );

        // Set stored role to admin and redirect to admin workspace
        document.cookie = `demo_role=admin; path=/; max-age=86400; SameSite=Lax`;
        setStoredRole("admin");
        router.push("/dashboard/admin");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      const errMsg = err?.message || "Registration encountered an issue. Please try again.";
      setError(errMsg);
      toast.error("Registration Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={mode === "customer" ? "Create Customer Account" : "Create Admin Workspace"}
      description={
        mode === "customer"
          ? "Register as a client to review quotes, negotiate terms, and track orders"
          : "Register as an administrator to set up your organization workspace and team"
      }
      activeTab="signup"
      linkComponent={Link}
      footerNote={
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          {/* Prominent Mode Switcher Link / Message */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-center transition-all hover:bg-slate-100/80">
            {mode === "customer" ? (
              <p className="text-xs text-slate-600 font-medium flex items-center justify-center flex-wrap gap-1">
                <span>Looking to manage an enterprise workspace?</span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="inline-flex items-center gap-1 font-bold text-[#ff5e3a] hover:text-[#e04f2e] hover:underline cursor-pointer transition ml-1"
                >
                  <ShieldCheck size={14} className="text-[#ff5e3a]" />
                  <span>Signup for admin</span>
                  <ArrowRight size={13} />
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600 font-medium flex items-center justify-center flex-wrap gap-1">
                <span>Looking for client or quotation portal?</span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="inline-flex items-center gap-1 font-bold text-[#ff5e3a] hover:text-[#e04f2e] hover:underline cursor-pointer transition ml-1"
                >
                  <Sparkles size={14} className="text-[#ff5e3a]" />
                  <span>Signup for customer</span>
                  <ArrowRight size={13} />
                </button>
              </p>
            )}
          </div>

          {/* Standard Login Link */}
          <p className="text-xs text-slate-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-[#ff5e3a] hover:underline font-semibold transition ml-0.5">
              Log In
            </Link>
          </p>
        </div>
      }
    >
      {/* Role Badge Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            mode === "customer"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          {mode === "customer" ? (
            <>
              <Sparkles size={13} />
              <span>Customer / Client Role (Default)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={13} />
              <span>Workspace Administrator Role</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleMode}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition"
        >
          <ArrowLeftRight size={12} />
          <span>Switch form</span>
        </button>
      </div>

      {/* Form Elements */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="fullName">
            {mode === "customer" ? "Full Name" : "Administrator Name"} <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameTouched(true);
              }}
              placeholder={mode === "customer" ? "Johnathan Ward" : "Alex Rivera"}
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                nameError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {nameError && <span className="text-[11px] text-red-500 font-medium">{nameError}</span>}
        </div>

        {/* Email Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="email">
            {mode === "customer" ? "Email Address" : "Work Email"} <span className="text-[#ff5e3a]">*</span>
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTouched(true);
              }}
              placeholder={mode === "customer" ? "buyer@acmecorp.com" : "admin@dealflow360.com"}
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {emailError && <span className="text-[11px] text-red-500 font-medium">{emailError}</span>}
        </div>

        {/* Company / Organization Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="companyName">
            {mode === "customer" ? "Company Name (Optional)" : "Organization / Company Name"}{" "}
            {mode === "admin" && <span className="text-[#ff5e3a]">*</span>}
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="companyName"
              type="text"
              required={mode === "admin"}
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyTouched(true);
              }}
              placeholder={mode === "customer" ? "Acme Corporation" : "Apex Enterprise Technologies Inc"}
              className={`w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border ${
                companyError
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              }`}
            />
          </div>
          {companyError && <span className="text-[11px] text-red-500 font-medium">{companyError}</span>}
        </div>

        {/* Mode specific fields: Phone for customer, Currency for admin */}
        {mode === "customer" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="phone">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 outline-none transition-all border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="currency">
                Workspace Currency <span className="text-[#ff5e3a]">*</span>
              </label>
              <div className="relative">
                <Coins size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#f8fafc] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition-all border border-slate-200 focus:border-[#ff5e3a] focus:ring-2 focus:ring-[#ff5e3a]/20 cursor-pointer"
                >
                  <option value="INR">INR (₹) - Indian Rupee (Default)</option>
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="AUD">AUD ($) - Australian Dollar</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <ShieldCheck size={16} className="text-[#ff5e3a] shrink-0" />
              <span>This account will be configured as the <strong>Workspace Administrator</strong> with full organization governance.</span>
            </div>
          </>
        )}

        {/* Create Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
            Create Password <span className="text-[#ff5e3a]">*</span>
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

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ea4e28] text-white font-semibold text-sm transition-all shadow-md shadow-[#ff5e3a]/25 active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {loading
                ? "Creating account..."
                : mode === "customer"
                ? "Register as Customer"
                : "Create Admin Workspace"}
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

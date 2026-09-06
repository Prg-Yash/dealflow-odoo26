import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Standalone Cross-Origin Better Auth Client
 * Configured with twoFactorClient plugin and credentials enabled.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  fetchOptions: {
    credentials: "include", // Ensures cross-origin session cookies are transmitted
  },
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        // Handled in-place by the /login interactive component
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession, twoFactor } = authClient;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Dispatches verification email for an unverified user account
 */
export async function sendVerificationEmail({
  email,
  callbackURL,
}: {
  email: string;
  callbackURL?: string;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const targetCallback = callbackURL || `${origin}/profile?verified=true`;

  const response = await fetch(`${API_URL}/api/auth/send-verification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      callbackURL: targetCallback,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to send verification email. Please try again.");
  }
  return data;
}

export interface User2FAStatusResponse {
  totpEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhoneNumber: string | null;
  whatsappVerified: boolean;
  maskedPhone: string | null;
}

/**
 * Retrieves the comprehensive 2FA status for the logged-in user
 */
export async function fetch2FAStatus(): Promise<User2FAStatusResponse> {
  const res = await fetch(`${API_URL}/api/2fa/status`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch 2FA status.");
  }
  return json.data;
}

/**
 * Requests an OTP to verify a new WhatsApp phone number
 */
export async function sendWhatsAppVerificationOtp(phoneNumber: string) {
  const res = await fetch(`${API_URL}/api/2fa/whatsapp/send-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phoneNumber }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to send WhatsApp verification OTP.");
  }
  return json;
}

/**
 * Confirms OTP and enables WhatsApp 2FA
 */
export async function confirmWhatsAppVerificationOtp(phoneNumber: string, otp: string) {
  const res = await fetch(`${API_URL}/api/2fa/whatsapp/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phoneNumber, otp }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Incorrect or expired WhatsApp OTP code.");
  }
  return json;
}

/**
 * Toggles WhatsApp 2FA on/off
 */
export async function toggleWhatsApp2FA(enabled: boolean) {
  const res = await fetch(`${API_URL}/api/2fa/whatsapp/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ enabled }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to update WhatsApp 2FA settings.");
  }
  return json;
}

export interface Check2FAResponse {
  requires2FA: boolean;
  userId: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  whatsappEnabled: boolean;
  maskedPhone: string | null;
}

/**
 * Checks 2FA requirements before finalizing login
 */
export async function check2FALoginRequirement(identifier: string): Promise<Check2FAResponse> {
  const res = await fetch(`${API_URL}/api/2fa/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to check two-factor authentication requirement.");
  }
  return json.data;
}

/**
 * Dispatches a WhatsApp OTP during login 2FA challenge
 */
export async function sendLoginWhatsAppOtp(userId: string) {
  const res = await fetch(`${API_URL}/api/2fa/login/whatsapp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to send WhatsApp login OTP.");
  }
  return json;
}

/**
 * Verifies a WhatsApp OTP and establishes the user session
 */
export async function verifyLoginWhatsAppOtp(userId: string, otp: string) {
  const res = await fetch(`${API_URL}/api/2fa/login/whatsapp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, otp }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Invalid or expired WhatsApp OTP code.");
  }
  return json.data;
}

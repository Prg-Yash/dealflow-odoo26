import { createAuthClient } from "better-auth/react";

/**
 * Standalone Cross-Origin Better Auth Client
 * Configured to make direct requests to the absolute URL of the standalone API service (e.g. http://localhost:4000),
 * completely bypassing local Next.js /api proxy routes.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  fetchOptions: {
    credentials: "include", // Ensures cross-origin session cookies are transmitted
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const response = await fetch(`${apiUrl}/api/auth/send-verification-email`, {
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

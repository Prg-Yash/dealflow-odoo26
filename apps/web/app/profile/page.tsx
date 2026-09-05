"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut, sendVerificationEmail } from "../../lib/auth-client";
import styles from "../auth.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationAlert, setVerificationAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Check if returning from a successful verification link
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        setVerificationAlert({
          type: "success",
          message: "🎉 Email verified successfully! Your workspace account is now verified.",
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
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
        headers: {
          "Content-Type": "application/json",
        },
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
      <div className={styles.container}>
        <div className={styles.authCard} style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div className={styles.spinner} style={{ margin: "0 auto 1.5rem auto", width: "32px", height: "32px" }}></div>
          <p style={{ color: "#94a3b8" }}>Loading authenticated session from standalone API...</p>
        </div>
      </div>
    );
  }

  if (error || !session?.user) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.header}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }}></span>
              No Active Session
            </div>
            <h1 className={styles.title}>Access Denied</h1>
            <p className={styles.subtitle}>
              You are currently signed out. Please sign in or create an account to view your profile.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <Link href="/login" className={styles.button} style={{ textDecoration: "none" }}>
              Sign In
            </Link>
            <Link href="/register" className={`${styles.button} ${styles.buttonSecondary}`} style={{ textDecoration: "none" }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userDetails}>
            <div className={styles.badge}>
              <span className={styles.badgeDot}></span>
              Better Auth Session Active
            </div>
            <h2>{user.name || "Workspace User"}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        {verificationAlert && (
          <div
            className={`${styles.alert} ${verificationAlert.type === "error" ? styles.alertError : styles.alertSuccess}`}
            style={{ marginBottom: "1.5rem" }}
          >
            <span>{verificationAlert.type === "error" ? "⚠️" : "✉️"}</span>
            <span>{verificationAlert.message}</span>
          </div>
        )}

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoCardLabel}>User ID</div>
            <div className={styles.infoCardValue} style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>
              {user.id}
            </div>
          </div>

          <div className={styles.infoCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className={styles.infoCardLabel}>Email Verified</div>
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={sendingVerification}
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#c7d2fe",
                    borderRadius: "6px",
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: sendingVerification ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  {sendingVerification ? (
                    <div className={styles.spinner} style={{ width: "10px", height: "10px" }}></div>
                  ) : (
                    "✉️ Verify"
                  )}
                </button>
              )}
            </div>
            <div className={styles.infoCardValue} style={{ color: user.emailVerified ? "#10b981" : "#f59e0b", marginTop: "0.3rem" }}>
              {user.emailVerified ? "Verified ✓" : "Pending Verification"}
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoCardLabel}>API Origin</div>
            <div className={styles.infoCardValue} style={{ fontSize: "0.85rem", color: "#818cf8" }}>
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoCardLabel}>Auth Architecture</div>
            <div className={styles.infoCardValue} style={{ fontSize: "0.85rem", color: "#ec4899" }}>
              Direct Cross-Origin
            </div>
          </div>
        </div>

        {!user.emailVerified && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#fbbf24", fontSize: "0.9rem" }}>
                Email Verification Pending
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                Send a confirmation link to <strong style={{ color: "#e2e8f0" }}>{user.email}</strong> to verify this account.
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendVerificationEmail}
              disabled={sendingVerification}
              className={styles.button}
              style={{
                width: "auto",
                padding: "0.55rem 1.1rem",
                fontSize: "0.85rem",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {sendingVerification ? (
                <div className={styles.spinner} style={{ width: "14px", height: "14px" }}></div>
              ) : (
                "✉️ Send Verification Email"
              )}
            </button>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <div className={styles.infoCardLabel} style={{ marginBottom: "0.5rem" }}>
            Raw Session Payload (Prisma / NeonDB)
          </div>
          <pre className={styles.codeBlock}>{JSON.stringify(session, null, 2)}</pre>
        </div>

        {jobStatus && (
          <div className={`${styles.alert} ${jobStatus.startsWith("Error") || jobStatus.startsWith("Connection") ? styles.alertError : styles.alertSuccess}`}>
            <span>{jobStatus.startsWith("Error") ? "⚠️" : "🚀"}</span>
            <span>{jobStatus}</span>
          </div>
        )}

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.button}
            style={{ flex: "1 1 220px" }}
            onClick={handleTriggerComputeJob}
            disabled={triggeringJob}
          >
            {triggeringJob ? <div className={styles.spinner}></div> : "⚡ Trigger Background Compute"}
          </button>

          <Link
            href="/"
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ flex: "0 0 auto", textDecoration: "none" }}
          >
            Monorepo Home
          </Link>

          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            style={{ flex: "0 0 auto" }}
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? <div className={styles.spinner}></div> : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}


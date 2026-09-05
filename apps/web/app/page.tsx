import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

export default function Home() {
  return (
    <div className={styles.page}>
      <header
        style={{
          width: "100%",
          maxWidth: "960px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          margin: "0 auto 2rem auto",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 10px #10b981",
              display: "inline-block",
            }}
          ></span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#cbd5e1" }}>
            Standalone API (Better Auth: Port 4000)
          </span>
        </div>

        <nav style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "#a5b4fc",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 2px 10px rgba(99, 102, 241, 0.3)",
            }}
          >
            Register
          </Link>
          <Link
            href="/profile"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#e2e8f0",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            Profile
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <ThemeImage
          className={styles.logo}
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
          priority
        />

        <div
          style={{
            maxWidth: "600px",
            textAlign: "center",
            margin: "1rem 0",
            padding: "1.25rem",
            background: "rgba(17, 24, 39, 0.5)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "#ffffff" }}>
            Decoupled Auth &amp; Compute Architecture
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.6 }}>
            Frontend requests communicate cross-origin with the standalone <code>apps/api</code> service
            (Better Auth + Prisma NeonDB), while <code>apps/worker</code> handles heavy 24/7 background compute jobs.
          </p>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/login">
            🔐 Try Better Auth Login
          </Link>
          <Link className={styles.secondary} href="/register">
            ✨ Register New User
          </Link>
        </div>

        <Button appName="web" className={styles.secondary}>
          Open alert
        </Button>
      </main>

      <footer className={styles.footer}>
        <Link href="/profile">Profile &amp; Session</Link>
        <Link href="/forgot-password">Forgot Password</Link>
        <a
          href="https://turborepo.dev?utm_source=create-turbo"
          target="_blank"
          rel="noopener noreferrer"
        >
          Go to turborepo.dev →
        </a>
      </footer>
    </div>
  );
}

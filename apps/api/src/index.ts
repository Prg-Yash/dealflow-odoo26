import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { prisma, JobStatus } from "@repo/db";
import { ENV } from "./config/env.js";
import { auth } from "./lib/auth.js";

const app = express();

const allowedOrigins = [
  ENV.WEB_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://localhost:4000",
];

// CORS Middleware with credentials enabled for cross-origin cookies & headers
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev to support testing tools
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "x-requested-with",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Mount Better Auth handler on /api/auth/*
// toNodeHandler parses raw request bodies so we mount it before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// Body parsers for custom application API routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/api/health", async (_req: Request, res: Response) => {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    service: "apps/api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    authProvider: "Better Auth (Prisma / NeonDB)",
    corsOrigins: allowedOrigins,
  });
});

// Authenticated Session Inspector
app.get("/api/me", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        authenticated: false,
        user: null,
        session: null,
      });
    }

    return res.json({
      authenticated: true,
      user: session.user,
      session: session.session,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to retrieve session",
      message: (error as Error).message,
    });
  }
});

// Demo Background Job Trigger (Interacts with @repo/db)
app.post("/api/jobs/trigger", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    const { taskType = "matrix-multiplication", matrixSize = 64, iterations = 10 } = req.body;

    const job = await prisma.job.create({
      data: {
        name: `User Requested Compute [${taskType}]`,
        type: taskType,
        payload: { matrixSize, iterations, requestedAt: new Date().toISOString() },
        status: JobStatus.PENDING,
        userId: session?.user?.id ?? null,
      },
    });

    return res.status(201).json({
      message: "Compute job enqueued to NeonDB for worker execution",
      job,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to trigger job",
      message: (error as Error).message,
    });
  }
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API Error]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

const server = app.listen(ENV.PORT, ENV.HOST, () => {
  console.log("==================================================");
  console.log(`  🚀 Dealflow 360 API Server (Better Auth + Express)`);
  console.log(`  URL         : http://${ENV.HOST === "0.0.0.0" ? "localhost" : ENV.HOST}:${ENV.PORT}`);
  console.log(`  Auth Base   : ${ENV.BETTER_AUTH_URL}/api/auth`);
  console.log(`  CORS Origin : ${ENV.WEB_ORIGIN}`);
  console.log(`  Database    : NeonDB via @repo/db`);
  console.log("==================================================");
});

// Graceful shutdown
function shutdown() {
  console.log("\nShutting down API server gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Prisma disconnected. API server stopped.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

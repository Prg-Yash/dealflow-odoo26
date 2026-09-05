import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { prisma, JobStatus } from "@repo/db";
import { ENV } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { authRouter } from "./routes/auth.routes.js";
import { organizationRouter } from "./routes/organization.routes.js";
import { warehouseRouter } from "./routes/warehouse.routes.js";
import { memberRouter } from "./routes/member.routes.js";
import { customerTiersRouter } from "./routes/customer-tier.routes.js";
import { customersRouter } from "./routes/customer.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { priceListRouter } from "./routes/price-list.routes.js";
import { discountRuleRouter } from "./routes/discount-rule.routes.js";
import { productRecommendationRouter } from "./routes/product-recommendation.routes.js";
import { quotationRouter } from "./routes/quotation.routes.js";
import { stockLevelRouter } from "./routes/stock-level.routes.js";
import { portalRouter } from "./routes/portal.routes.js";
import { counterProposalRouter } from "./routes/counter-proposal.routes.js";
import { errorHandler } from "./middleware/error.js";

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

// Domain API Routers (supporting both /api and direct root prefixes)
app.use(["/api", "/"], authRouter);
app.use(["/api/organizations", "/organizations"], organizationRouter);
app.use(["/api/warehouses", "/warehouses"], warehouseRouter);
app.use(["/api", "/"], memberRouter);
app.use(["/api/customer-tiers", "/customer-tiers"], customerTiersRouter);
app.use(["/api/customers", "/customers"], customersRouter);
app.use(["/api/categories", "/categories"], categoryRouter);
app.use(["/api/products", "/products"], productRouter);
app.use(["/api/price-lists", "/price-lists"], priceListRouter);
app.use(["/api/discount-approval-rules", "/discount-approval-rules"], discountRuleRouter);
app.use(["/api/product-recommendations", "/product-recommendations"], productRecommendationRouter);
app.use(["/api/quotations", "/quotations"], quotationRouter);
app.use(["/api/stock-levels", "/stock-levels"], stockLevelRouter);
app.use(["/api/portal", "/portal"], portalRouter);
app.use(["/api/counter-proposals", "/counter-proposals"], counterProposalRouter);

// Demo Background Job Trigger (Interacts with @repo/db)
app.post(["/api/jobs/trigger", "/jobs/trigger"], async (req: Request, res: Response) => {
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

// Centralized Error Handling Middleware
app.use(errorHandler);

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

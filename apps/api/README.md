# Dealflow 360 - API Server (`apps/api`)

An enterprise-grade B2B Quotation, Pricing Engine, Multi-Warehouse Fulfillment, Hybrid Invoicing, and Deal Health REST API built with Express 5, TypeScript strict mode, Better Auth, BullMQ, and Prisma on PostgreSQL (NeonDB).

---

## 📐 Architecture Overview

`apps/api` strictly implements a **Controller-Service-Engine-Repository** pattern optimized for high auditability, multi-tenant isolation, and zero-boilerplate business logic:

```
                  ┌────────────────────────┐
                  │    HTTP Client / Web   │
                  └───────────┬────────────┘
                              │
                    ┌─────────▼────────┐
                    │ Express Router   │
                    └─────────┬────────┘
                              │
                 ┌────────────▼───────────┐
                 │  Auth & Middleware     │ (Session/Bearer, Tenant Context, Zod Validation)
                 └────────────┬───────────┘
                              │
                    ┌─────────▼────────┐
                    │   Controllers    │ (HTTP Request Parsing & Response Formatting)
                    └─────────┬────────┘
                              │
                    ┌─────────▼────────┐
                    │    Services      │ (Transactional Orchestration & DB Mutations)
                    └────┬──────────┬──┘
                         │          │
    ┌────────────────────▼┐        ┌▼─────────────────────┐
    │ Analytical Engines  │        │   Database & Queue   │
    │ (Pure Math / Logic) │        │ Prisma (@repo/db)    │
    │  - Risk Engine      │        │ BullMQ (Redis)       │
    │  - Upsell Engine    │        └──────────────────────┘
    │  - Fulfillment      │
    │  - Billing Engine   │
    │  - Deal Health      │
    └─────────────────────┘
```

---

## 📁 Directory Structure

```
apps/api/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Entry point, router mounts, & server bootstrap
    ├── config/                     # Environment, roles, & Redis connections
    │   ├── env.ts                  # Zod-validated runtime environment
    │   ├── redis.ts                # Upstash / ioredis TLS client configuration
    │   └── roles.ts                # System RBAC definitions & permission matrix
    ├── lib/                        # Pure mathematical & analytical decision engines
    │   ├── auth.ts                 # Better Auth instance & provider setup
    │   ├── billing-engine.ts       # Pure proration, refund, & MRR/ARR formulas
    │   ├── deal-health-engine.ts   # Stalled deals, discount anomalies, & slippage
    │   ├── fulfillment-engine.ts   # Greedy multi-warehouse split & backorders
    │   ├── risk-engine.ts          # Revenue-weighted blended risk & margin scorer
    │   └── upsell-engine.ts        # Dynamic cross-sell & margin delta ranking
    ├── middleware/                 # Request pipeline & security guards
    │   ├── auth.middleware.ts      # Better Auth session & role verification
    │   ├── tenant.ts               # Multi-tenant isolation (req.orgId injection)
    │   ├── validate.ts             # Generic Zod body & query validators
    │   └── error.ts                # Centralized error handler & status mapping
    ├── schemas/                    # Zod input validation schemas
    │   ├── billing.schema.ts
    │   ├── category.schema.ts
    │   ├── customer.schema.ts
    │   ├── customer-tier.schema.ts
    │   ├── deal-health.schema.ts
    │   ├── fulfillment.schema.ts
    │   ├── pricing.schema.ts
    │   ├── product.schema.ts
    │   ├── quotation.schema.ts
    │   └── warehouse.schema.ts
    ├── controllers/                # HTTP request handlers & response mappers
    │   ├── auth.controller.ts
    │   ├── billing.controller.ts
    │   ├── category.controller.ts
    │   ├── customer.controller.ts
    │   ├── customer-tier.controller.ts
    │   ├── deal-health.controller.ts
    │   ├── fulfillment.controller.ts
    │   ├── member.controller.ts
    │   ├── organization.controller.ts
    │   ├── pricing.controller.ts
    │   ├── product.controller.ts
    │   ├── quotation.controller.ts
    │   └── warehouse.controller.ts
    ├── services/                   # Transactional domain business services
    │   ├── billing.service.ts
    │   ├── category.service.ts
    │   ├── customer.service.ts
    │   ├── customer-tier.service.ts
    │   ├── deal-health.service.ts
    │   ├── email.service.ts
    │   ├── fulfillment.service.ts
    │   ├── invitation.service.ts
    │   ├── job.service.ts
    │   ├── organization.service.ts
    │   ├── pricing.service.ts
    │   ├── product.service.ts
    │   ├── quotation.service.ts
    │   └── warehouse.service.ts
    ├── routes/                     # Domain router definitions
    │   ├── auth.routes.ts
    │   ├── billing.routes.ts
    │   ├── category.routes.ts
    │   ├── customer.routes.ts
    │   ├── customer-tier.routes.ts
    │   ├── deal-health.routes.ts
    │   ├── discount-rule.routes.ts
    │   ├── fulfillment.routes.ts
    │   ├── member.routes.ts
    │   ├── organization.routes.ts
    │   ├── price-list.routes.ts
    │   ├── product.routes.ts
    │   ├── product-recommendation.routes.ts
    │   ├── quotation.routes.ts
    │   ├── stock-level.routes.ts
    │   └── warehouse.routes.ts
    └── queues/                     # BullMQ queue producers
        └── backorder.queue.ts      # Asynchronous backorder replenishment queue
```

---

## 🔐 Security, RBAC & Multi-Tenancy

### 1. Role-Based Access Control (`UserRole`)
Governed by `src/config/roles.ts` and enforced via `requireRole(...roles)`:
* **`ADMIN`**: Full platform and organization governance.
* **`SALES_MANAGER`**: Pipeline oversight, deal health monitoring, Tier 1 discount reviews.
* **`SALES_REP`**: Quotation creation, line drafting, margin reviews, customer assignment.
* **`FINANCE_OPS`**: Warehouse splits, shipment management, hybrid invoicing, payment reconciliation, and credit notes.
* **`CUSTOMER`**: Read-only negotiation portal scoped strictly to their own organization's records.

### 2. Multi-Tenant Scoping (`tenantMiddleware`)
* Enforces tenant boundary isolation across all tables.
* Validates user membership and attaches `req.orgId`.
* Direct service queries inject `where: { organizationId: orgId }`.

---

## 🧠 Core Analytical Decision Engines (`src/lib/`)

Every engine in `src/lib/` is a **pure function** containing zero Prisma or Express dependencies. They are deterministic, fast, and unit-testable.

### 1. Risk Assessment Engine (`risk-engine.ts`)
* **Dual-Ceiling Breach**:
  $$\text{lineCeiling} = \min(\text{tierCeiling}, \text{categoryCeiling})$$
  $$\text{overage} = \max(0, \text{discountPercent} - \text{lineCeiling})$$
  $$\text{isCeilingBreached} = \text{overage} > 0$$
* **Revenue-Weighted Blended Risk**:
  $$\text{blendedRiskScore} = \frac{\sum (\text{overage}_i \times \text{netPrice}_i)}{\sum \text{netPrice}_i}$$
* Populates per-line `riskPoints` and live gross margins.

### 2. Upsell & Recommendation Engine (`upsell-engine.ts`)
* Ranks co-purchased and cross-sell candidate products using pair co-occurrence frequencies and margin deltas.
* Filters out items already present in the active quote.

### 3. Fulfillment Greedy Split Engine (`fulfillment-engine.ts`)
* Sorts available warehouses ascending by `shippingCostWeight`.
* Greedily allocates available inventory (`quantityOnHand - quantityReserved`) from the lowest-cost facility first.
* Residual unmet quantities are isolated as `backorderQuantity`.

### 4. Billing & Proration Engine (`billing-engine.ts`)
* **Signed Mid-Cycle Proration**:
  $$\text{proratedDelta} = (\text{newQty} - \text{oldQty}) \times \text{unitPrice} \times \frac{\text{daysRemaining}}{\text{cycleLengthDays}}$$
* **Cancellation Refund Calculation**:
  $$\text{refundAmount} = \text{amountPaidThisCycle} \times \frac{\text{daysRemaining}}{\text{cycleLengthDays}}$$
  Supports `PRORATED`, `FULL`, and `NO_REFUND`.
* **MRR / ARR Normalization**: Normalizes across `MONTHLY`, `QUARTERLY`, and `ANNUALLY` contracts.

### 5. Deal Health & Anomaly Engine (`deal-health-engine.ts`)
* **Stalled Quotes**: Flags in-flight quotes (`DRAFT`, `PENDING_APPROVAL`, `NEGOTIATION`) untouched for $\ge \text{thresholdDays}$.
* **Zero-Safe Discount Anomalies**:
  - Reps with no history fall back to the **organization-wide average**, **NEVER to zero**.
  - Flags discounts exceeding $\text{effectiveBaseline} \times \text{multiplier}$.
* **Fulfillment Slippage**: Detects undelivered orders where current date exceeds promised delivery date.

---

## 🚀 Complete REST API Reference

All routes are mounted under both `/api/<endpoint>` and direct root `/<endpoint>`.

### 1. Authentication & Tenancy
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/*` | Public | Better Auth handler (signup, login, session management) |
| `POST` | `/organizations` | Public | Bootstrap new tenant organization + initial ADMIN user |
| `POST` | `/invitations` | `ADMIN` | Invite team members or customer portal users |
| `POST` | `/invitations/:token/accept` | Public | Accept invitation, create user, and generate role profile |
| `GET` | `/me` | Authenticated | Return active user identity and linked role profile |

### 2. Customers & Pricing Governance
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/customer-tiers` | `ADMIN`, `SALES_MANAGER` | List customer tiers with ceiling rules |
| `POST` | `/customer-tiers` | `ADMIN` | Create customer tier |
| `PATCH` | `/customer-tiers/:id` | `ADMIN` | Update customer tier ceilings |
| `GET` | `/customers` | Staff | List tenant customers (filterable by rep or tier) |
| `POST` | `/customers` | `ADMIN`, `SALES_MANAGER` | Create customer record |
| `PATCH` | `/customers/:id` | `ADMIN`, `SALES_MANAGER` | Update customer profile |
| `DELETE` | `/customers/:id` | `ADMIN` | Soft-deactivate customer record |
| `PATCH` | `/customers/:id/assign-rep` | `SALES_MANAGER`, `ADMIN` | Assign or reassign account sales representative |
| `GET` | `/categories` | Staff | List product categories with discount ceilings and target margins |
| `POST` | `/categories` | `ADMIN` | Create category |
| `GET` | `/products` | Staff | List catalog products |
| `POST` | `/products` | `ADMIN` | Create catalog product |
| `POST` | `/products/:id/variants` | `ADMIN` | Add SKU variant with price/cost delta |
| `GET` | `/products/:id/effective-price` | Staff | Resolve customer effective price via PriceList override |
| `GET` | `/price-lists` | Staff | List tier/currency price lists |
| `POST` | `/price-lists` | `ADMIN` | Create price list and tier overrides |
| `GET` | `/discount-approval-rules` | Staff | List discount approval range rules |
| `POST` | `/discount-approval-rules` | `ADMIN` | Configure approval rule mapping |
| `GET` | `/product-recommendations` | Staff | List co-purchase recommendation pairs |
| `POST` | `/product-recommendations` | `ADMIN` | Configure product co-purchase pairing |

### 3. Multi-Warehouse Inventory (Atomic Ledger)
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/warehouses` | Staff | List facilities with `shippingCostWeight` |
| `POST` | `/warehouses` | `ADMIN` | Create warehouse facility |
| `GET` | `/stock-levels` | Staff | Query per-warehouse on-hand, reserved, and available stock |
| `PATCH` | `/stock-levels/:id` | `ADMIN`, `FINANCE_OPS` | Manual stock adjustment (always writes paired `StockMovement`) |
| `GET` | `/stock-levels/:id/available` | Staff | Returns calculated `quantityOnHand - quantityReserved` |

### 4. Quotations, Margin Calculations & Upsell
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/quotations` | Staff | List quotations (scoped to rep if `SALES_REP`) |
| `POST` | `/quotations` | `SALES_REP`, `SALES_MANAGER`, `ADMIN` | Create draft quotation |
| `GET` | `/quotations/:id` | Staff | Retrieve quote with live margins and risk breakdown |
| `POST` | `/quotations/:id/lines` | `SALES_REP`, `SALES_MANAGER`, `ADMIN` | Add line (auto-recomputes margins and blended risk) |
| `PATCH` | `/quotations/:id/lines/:lineId`| `SALES_REP`, `SALES_MANAGER`, `ADMIN` | Update quantity or discount |
| `DELETE` | `/quotations/:id/lines/:lineId`| `SALES_REP`, `SALES_MANAGER`, `ADMIN` | Remove line item |
| `POST` | `/quotations/:id/submit` | `SALES_REP`, `SALES_MANAGER`, `ADMIN` | Transition `DRAFT` $\to$ `APPROVED` or `PENDING_APPROVAL` |
| `GET` | `/quotations/:id/upsell-suggestions` | Staff | Ranked cross-sell recommendations with margin deltas |
| `POST` | `/quotations/:id/fulfillment-orders` | `FINANCE_OPS`, `ADMIN`, `SALES_MANAGER` | Create fulfillment order container |
| `POST` | `/quotations/:id/confirm` | Staff | Confirm quotation $\to$ creates Invoice & Subscription |

### 5. Multi-Warehouse Fulfillment & Transit
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/fulfillment-orders/:id/split-preview` | Staff | Run pure greedy split simulation without committing |
| `POST` | `/fulfillment-orders/:id/accept-split` | `FINANCE_OPS`, `ADMIN` | Commit allocations, reserve stock, and record backorders |
| `PATCH` | `/shipments/:id/status` | `FINANCE_OPS`, `ADMIN` | Walk status: `PENDING` $\to$ `PICKED` $\to$ `PACKED` $\to$ `SHIPPED` (deducts stock) $\to$ `DELIVERED` |
| `POST` | `/backorders/:id/consolidate` | `FINANCE_OPS`, `ADMIN`, System | Re-run split allocation after stock replenishment |

### 6. Hybrid Invoicing, Subscriptions & Settlements
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/subscriptions` | Staff | List recurring customer subscriptions |
| `GET` | `/subscriptions/:id` | Staff | Subscription details with active MRR and ARR |
| `PATCH` | `/subscriptions/:id/lines/:lineId`| `FINANCE_OPS`, `ADMIN` | Mid-cycle seat change: issues prorated invoice or credit note |
| `POST` | `/subscriptions/:id/cancel` | `FINANCE_OPS`, `ADMIN` | Cancel subscription: computes unused refund via CreditNote |
| `GET` | `/invoices` | Staff, `CUSTOMER` (own org) | List one-time and recurring invoices |
| `GET` | `/invoices/:id` | Staff, `CUSTOMER` (own org) | Get invoice breakdown, payment ledger, and status |
| `POST` | `/invoices/:id/payments` | `FINANCE_OPS`, `ADMIN` | Record payment settlement: increments paid, decrements remaining, flips to `PAID` |
| `GET` | `/credit-notes` | `FINANCE_OPS`, `ADMIN` | List issued credit adjustments |

### 7. Deal Health, Telemetry & Background Jobs
| Method | Path | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/deal-health/stalled` | Staff | Detect in-flight deals inactive past configured threshold days |
| `GET` | `/deal-health/anomalies` | Staff | Detect discount anomalies with zero-safe org-wide baseline fallback |
| `GET` | `/deal-health/slippage` | Staff | Detect fulfillment orders past promised delivery date |
| `GET` | `/jobs/:id` | Staff | Query unified background compute telemetry (NeonDB & BullMQ) |

---

## ⚡ Key Architectural Invariants

1. **Two-Stage Decoupled Inventory Management**:
   - `accept-split` increases `quantityReserved` without modifying `quantityOnHand` (Ledger: `ORDER_RESERVED`).
   - `updateShipmentStatus` to `SHIPPED` physically deducts `quantityOnHand` and releases `quantityReserved` (Ledger: `ORDER_FULFILLED`).
2. **Strict Hybrid Invoice / Subscription Separation**:
   - One-time hardware lines and recurring SaaS subscription lines never share calculation paths.
   - Credit notes generated from subscriptions never touch one-time invoices.
3. **Atomic Payment Settlement**:
   - Creating a payment, updating invoice balances, and flipping status to `PAID` execute within a single ACID transaction.
4. **Zero-Safe Rep Discount Anomaly Detection**:
   - Sales reps with no discount history fall back to the organization-wide average, preventing new reps from having standard discounts falsely flagged.
5. **Ledger Invariant**:
   - `StockLevel` is never edited directly without writing a corresponding `StockMovement` row in the same transaction.

---

## 🛠️ Development & Tooling Commands

Run all scripts from the workspace root or inside `apps/api`:

```bash
# Start API development server with tsx live-reload
pnpm --filter api dev

# Perform strict TypeScript typecheck (zero emit)
pnpm --filter api check-types

# Run ESLint validation
pnpm --filter api lint

# Build production distribution bundle
pnpm --filter api build

# Start production server
pnpm --filter api start
```

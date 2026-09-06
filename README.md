# DealFlow360 — Commercial CPQ & Deal Governance Platform

<div align="center">

![DealFlow360 Banner](docs/screenshots/admin_reporting_dashboard.jpg)

### Enterprise-grade Configure-Price-Quote (CPQ) engine with automated margin protection, multi-hop escalation workflows, interactive buyer negotiation, and zero-click downstream fulfillment.

[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444?style=for-the-badge&logo=turborepo)](https://turbo.build/)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/UI-React%2019-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.8-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma%206-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](<https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-4169e1?style=for-the-badge&logo=postgresql>)](https://neon.tech/)
[![Better Auth](https://img.shields.io/badge/Auth-Better--Auth-6366f1?style=for-the-badge)](https://better-auth.com/)
[![Expo 52](https://img.shields.io/badge/Mobile-Expo%2052-000020?style=for-the-badge&logo=expo)](https://expo.dev/)

[Key Features](#-core-platform-modules) • [System Architecture](#-system-architecture--diagrams) • [Visual Tour](#-visual-tour--screenshots) • [RBAC Roles](#-user-roles--rbac-matrix) • [Quickstart Guide](#-project-setup--execution-guide)

</div>

---

## 📑 Table of Contents

- [Executive Overview](#-executive-overview)
- [System Architecture & Diagrams](#-system-architecture--diagrams)
  - [1. High-Level Monorepo Architecture](#1-high-level-monorepo-architecture)
  - [2. End-to-End Deal Lifecycle Flow](#2-end-to-end-deal-lifecycle-flow)
  - [3. Dual-Constraint Blended Risk Engine](#3-dual-constraint-blended-risk-engine)
  - [4. Multi-Warehouse Split Fulfillment Pipeline](#4-multi-warehouse-split-fulfillment-pipeline)
- [Visual Tour & Screenshots](#-visual-tour--screenshots)
  - [1. Dynamic Quotation Proposal Builder](#1-dynamic-quotation-proposal-builder)
  - [2. Governance Matrix & Live Escalation Simulator](#2-governance-matrix--live-escalation-simulator)
  - [3. Deal Health & Anomaly Telemetry](#3-deal-health--anomaly-telemetry)
  - [4. Executive Analytics & Reporting Dashboard](#4-executive-analytics--reporting-dashboard)
  - [5. B2B Customer Portal & Negotiation Workspace](#5-b2b-customer-portal--negotiation-workspace)
- [User Roles & RBAC Matrix](#-user-roles--rbac-matrix)
- [Core Platform Modules](#-core-platform-modules)
  - [Module 1: Smart CPQ & Product Catalog](#module-1-smart-cpq--product-catalog)
  - [Module 2: Blended Risk & Margin Protection Engine](#module-2-blended-risk--margin-protection-engine)
  - [Module 3: Sequential Multi-Hop Approval Chains](#module-3-sequential-multi-hop-approval-chains)
  - [Module 4: Live Deal Escalation Simulator](#module-4-live-deal-escalation-simulator)
  - [Module 5: Deal Health & Anomaly Telemetry](#module-5-deal-health--anomaly-telemetry)
  - [Module 6: B2B Customer Portal, Negotiation & E-Signature](#module-6-b2b-customer-portal-negotiation--e-signature)
  - [Module 7: Multi-Warehouse Split Fulfillment & Inventory](#module-7-multi-warehouse-split-fulfillment--inventory)
  - [Module 8: Billing, Recurring Subscriptions & Credit Notes](#module-8-billing-recurring-subscriptions--credit-notes)
- [Unique Selling Propositions (USPs)](#-unique-selling-propositions-usps)
- [Technology Stack](#-technology-stack)
- [Monorepo Directory Layout](#-monorepo-directory-layout)
- [Project Setup & Execution Guide](#-project-setup--execution-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone Repository](#step-1-clone-repository)
  - [Step 2: Install Dependencies](#step-2-install-dependencies)
  - [Step 3: Environment Variables Setup](#step-3-environment-variables-setup)
  - [Step 4: Database Synchronization](#step-4-database-synchronization)
  - [Step 5: Master Multi-Tenant Seeding](#step-5-master-multi-tenant-seeding)
  - [Step 6: Run Development Servers](#step-6-run-development-servers)
  - [Pre-Seeded Demo Accounts](#pre-seeded-demo-accounts)
- [API Route Reference](#-api-route-reference)
- [License & Acknowledgments](#-license--acknowledgments)

---

## 🌟 Executive Overview

In B2B sales organizations, **uncontrolled discounting is the primary driver of margin erosion**. Sales reps discount aggressively to hit volume quotas, managers lack real-time visibility into product cost of goods sold (COGS), finance teams are buried in manual approval emails, and customers endure sluggish back-and-forth negotiations across static PDF documents.

**DealFlow360** eliminates this fragmentation by combining an intelligent Configure-Price-Quote (CPQ) builder with an active commercial governance engine:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE DEALFLOW360 DIFFERENCE                                     │
├────────────────────────────────┬────────────────────────────────┬───────────────────────────────┤
│     PREVENT MARGIN LEAKAGE     │     ACCELERATE DEAL VELOCITY   │   AUTOMATE POST-SALE HANDOFF  │
│  • Enforces tier & margin caps │  • 0-Hop instant auto-approval │  • Automatic stock allocation │
│  • Real-time COGS calculations │  • Sequential 1 & 2 hop routing│  • Split warehouse dispatch   │
│  • Revenue-weighted risk score │  • Online customer e-signature │  • Automatic invoice & SaaS   │
└────────────────────────────────┴────────────────────────────────┴───────────────────────────────┘
```

- **Active Firewall, Not Passive Audit**: Instead of detecting lost margins during monthly accounting close, DealFlow360 checks safety ceilings while quotes are being composed.
- **Dual-Constraint Risk Intelligence**: Simultaneously evaluates **Customer Tier Limits** (_who is buying_) and **Product Category Margins** (_what is being sold_).
- **Frictionless Velocity**: Low-risk standard deals are **auto-approved in zero seconds**, letting reps close deals immediately without administrative friction.
- **Interactive Buyer Collaboration**: Customers review live proposals via tokenized links, negotiate line items with threaded comments, propose counter-offers, and sign digitally.
- **Zero-Click Operational Handshake**: Once signed, orders automatically trigger inventory reservation, split shipments from optimal warehouses, and accounts receivable billing.

---

## 🏗️ System Architecture & Diagrams

### 1. High-Level Monorepo Architecture

DealFlow360 is architected as an enterprise monorepo managed by **Turborepo**, ensuring shared type contracts, rapid builds, and seamless synchronization across web, mobile, API, and background compute.

```mermaid
graph TB
    subgraph Clients["Frontend Layer"]
        WEB["🌐 Next.js 16 Web App<br/>(React 19 + Tailwind v4 + Recharts)<br/>Port: 3000"]
        MOBILE["📱 Expo 52 Mobile App<br/>(React Native + Expo Router)<br/>iOS & Android"]
        PORTAL["🤝 B2B Customer Portal<br/>(Tokenized Review & Canvas E-Sign)<br/>Port: 3000/portal"]
    end

    subgraph Backend["API & Business Logic Layer"]
        API["⚡ Express.js REST API Server<br/>(TypeScript + Better-Auth + Zod)<br/>Port: 4000"]
        RISK["🛡️ Blended Risk Engine<br/>(Live Margin & Threshold Scoring)"]
        WORKER["⚙️ BullMQ Background Worker<br/>(Backorders + Telemetry + Data Sync)"]
    end

    subgraph Data["Persistence & Storage Layer"]
        PRISMA["🔷 Prisma ORM v6<br/>(Type-Safe Client & Migrations)"]
        POSTGRES[("🐘 PostgreSQL Database<br/>(Neon Serverless / 25+ Entities)")]
        SMTP["✉️ Gmail SMTP Service<br/>(Quote Dispatches & 2FA OTPs)"]
    end

    WEB -->|REST API + Cookies| API
    PORTAL -->|Tokenized REST API| API
    MOBILE -->|REST API| API
    API --> RISK
    API --> WORKER
    API --> PRISMA
    WORKER --> PRISMA
    PRISMA --> POSTGRES
    API --> SMTP

    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef server fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef storage fill:#ecfdf5,stroke:#059669,stroke-width:2px;

    class WEB,MOBILE,PORTAL client;
    class API,RISK,WORKER server;
    class PRISMA,POSTGRES,SMTP storage;
```

---

### 2. End-to-End Deal Lifecycle Flow

This sequence traces a quotation through drafting, automated governance, sequential approvals, customer negotiation, e-signature, and post-sale fulfillment:

```mermaid
sequenceDiagram
    autonumber
    actor Rep as 👔 Sales Representative
    participant Engine as 🛡️ Blended Risk Engine
    actor Mgr as 🎖️ Sales Manager
    actor Fin as 💼 Finance Ops
    actor Client as 🤝 Customer (Buyer)
    participant Ops as 📦 Warehouse & Billing

    Note over Rep,Ops: Stage 1: Proposal Composition & Evaluation
    Rep->>Engine: Create quote (Customer Tier: Silver 10%, Hardware: 15% Max)
    Rep->>Engine: Enters line items & requested discounts
    Engine-->>Rep: Live Effective Line Ceilings, Risk Score & Gross Margin %

    alt Safe Deal (Condition 1: Risk = 0 & Disc ≤ 5%)
        Engine-->>Rep: 🟢 Auto-Approved (0 Hops) — Immediate Green Light
    else Moderate Exception (Condition 2: Risk ≤ 10 & Disc ≤ 15%)
        Rep->>Mgr: 🟡 Submit for Approval (Requires Sales Manager)
        Mgr->>Engine: Review line-item margins & click [Approve]
    else High-Risk Exception (Condition 3: Risk > 10 OR Disc > 15%)
        Rep->>Mgr: 🔴 Submit for Sequential Approval
        Mgr->>Fin: Manager signs off Step 1 → Routes to Finance
        Fin->>Engine: Finance Ops audits COGS & payment terms → Approves Step 2
    end

    Note over Rep,Client: Stage 2: Buyer Collaboration & Signing
    Rep->>Client: Dispatches tokenized quote link via email
    Client->>Client: Inspects line items on interactive portal
    opt Negotiation Cycle
        Client->>Rep: Submits structured counter-proposal & comments
        Rep->>Engine: Adjusts terms or requests re-routing
    end
    Client->>Ops: Signs digitally on HTML5 canvas (captures IP & timestamp)

    Note over Ops: Stage 3: Zero-Click Downstream Execution
    Ops->>Ops: Quote marked WON
    Ops->>Ops: Fulfillment Order auto-generated (Stock reserved across regional hubs)
    Ops->>Ops: Split shipment dispatched from optimal warehouse (weight routing)
    Ops->>Ops: AR Invoice issued (Net 30/60) & SaaS Subscription activated
```

---

### 3. Dual-Constraint Blended Risk Engine

The Blended Risk Engine ensures that discounts are checked against both **account relationship privileges** and **product margin thresholds**:

```mermaid
flowchart LR
    subgraph Inputs["1. Commercial Inputs"]
        T["Customer Tier (WHO)<br/>• Bronze: 5%<br/>• Silver: 10%<br/>• Gold: 15%<br/>• Platinum: 20%"]
        C["Category Ceiling (WHAT)<br/>• Hardware: 15% (35% GM)<br/>• Services: 10% (60% GM)<br/>• SaaS: 12% (85% GM)"]
        D["Entered Line Discount %"]
    end

    subgraph Calculations["2. Risk Calculations"]
        F1["Effective Line Ceiling =<br/><b>MIN(Tier Ceiling, Category Ceiling)</b>"]
        F2["Line Overage =<br/><b>MAX(0, Entered Discount - Line Ceiling)</b>"]
        F3["Blended Risk Score =<br/><b>Σ(Overage × Net Revenue) / Total Net Revenue</b>"]
        F4["Deal Gross Margin % =<br/><b>(Net Revenue - Total COGS) / Net Revenue × 100</b>"]
    end

    subgraph Routing["3. Approval Gateway"]
        R1["Condition 1 (0 Hops 🟢)<br/>Risk Score = 0 & Disc ≤ 5%<br/><b>AUTO-APPROVED</b>"]
        R2["Condition 2 (1 Hop 🟡)<br/>Risk Score ≤ 10 & Disc ≤ 15%<br/><b>Sales Manager Sign-off</b>"]
        R3["Condition 3 (2 Hops 🔴)<br/>Risk Score > 10 OR Disc > 15%<br/><b>Manager + Finance Dual Sign-off</b>"]
    end

    T --> F1
    C --> F1
    D --> F2
    F1 --> F2
    F2 --> F3
    F3 --> Routing
    F4 -.-> Routing

    F3 -->|Low Risk| R1
    F3 -->|Moderate Risk| R2
    F3 -->|High Risk| R3

    classDef in fill:#eff6ff,stroke:#3b82f6,stroke-width:1px;
    classDef calc fill:#fefce8,stroke:#eab308,stroke-width:1px;
    classDef gate fill:#f0fdf4,stroke:#22c55e,stroke-width:1px;

    class T,C,D in;
    class F1,F2,F3,F4 calc;
    class R1,R2,R3 gate;
```

---

### 4. Multi-Warehouse Split Fulfillment Pipeline

When an order is confirmed, DealFlow360 optimizes shipping costs and handles stock shortages across regional distribution hubs:

```mermaid
flowchart TD
    A[Quotation Accepted & Signed] --> B[Generate Central Fulfillment Order]
    B --> C{Verify Regional Inventory}

    C -->|Full Stock at Primary Warehouse| D[Single Shipment Dispatched]
    C -->|Stock Split Across Depots| E[Route Split Shipments]
    C -->|Partial Stock Shortage| F[Create Immediate Backorder]

    E --> E1["Hub A (Denver, Weight: 1.0)<br/>Picks Servers & Hardware"]
    E --> E2["Hub B (Newark, Weight: 1.25)<br/>Picks Network Switches"]

    F --> F1["BullMQ Backorder Processor monitors replenishment"]
    F1 --> F2["Auto-allocates when inventory arrives"]

    D --> G[Generate Carrier Tracking & Deduct Stock]
    E1 --> G
    E2 --> G
    F2 --> G
    G --> H[Final Order Fulfilled]
```

---

## 📸 Visual Tour & Screenshots

### 1. Dynamic Quotation Proposal Builder

_Sales representatives compose proposals with instant customer tier safety checks, live line ceiling badges, and dynamic gross margin calculations._

![Quotation Proposal Builder](docs/screenshots/quotation_proposal_builder.jpg)

- **Who-What-Price Hierarchy**: Displays Customer Tier limit (WHO: Bronze 5%), Category Ceilings (WHAT: Hardware 15%, Services 10%), and active Price Schedule.
- **Real-Time Safety Ceiling Badges**: Computes the exact safety limit per line: `min(Customer Tier, Category Ceiling)`.
- **Financial Summary & Governance Panel**: Live Gross Margin %, total discount amount, and instant approval classification badge (Condition 1: Auto-Approved).

---

### 2. Governance Matrix & Live Escalation Simulator

_Executive RevOps console for configuring discount policies alongside an interactive simulation sandbox to test approval conditions before deploying rules._

![Discount Rules & Live Simulator](docs/screenshots/discount_rules_and_simulator.jpg)

- **Interactive Deal Simulator**: Interactive sliders for Discount Requested (8.5%), Blended Risk Score (12 pts), and Customer Account Tier to preview triggered approval workflows.
- **Customer Tier Discount Ceilings**: Clear classification thresholds across Bronze (5%), Silver (10%), Gold (15%), and Platinum (20%) tiers.
- **Category Ceilings & Taxonomies**: Enforced margin ceilings for Physical Hardware (Strict COGS Floor), Professional Services (T&M Limit), and SaaS Subscriptions (ARR Priority).

---

### 3. Deal Health & Anomaly Telemetry

_Managerial oversight dashboard tracking stalled pipelines, rep discount baseline variances, and fulfillment SLA delivery slippages._

![Deal Health & Anomaly Telemetry](docs/screenshots/deal_health_anomaly_telemetry.jpg)

- **Discount Anomaly Radar**: Flags deals where the requested discount exceeds the sales representative's historical average baseline.
- **Pipeline Velocity Monitoring**: Identifies stalled quotes idling for 7+ days without buyer progress.
- **One-Click Action Triggers**: Instant `Nudge` and `Escalate` workflows to resolve blockers and accelerate revenue.

---

### 4. Executive Analytics & Reporting Dashboard

_Cross-team commercial analytics with drill-down filters by quarter, sales team, approval status, and product lines._

![Admin Reporting Dashboard](docs/screenshots/admin_reporting_dashboard.jpg)

- **High-Level KPIs**: Real-time tracking of total quotes created, pipeline value, average discount %, and pending approvals.
- **Pipeline Stage Breakdown**: Visual donut chart tracking deal progress (`CONFIRMED 71%`, `APPROVED 14%`, `PENDING_APPROVAL 14%`).
- **Revenue Attribution & Export**: Top performer leaderboards with one-click export to PDF and CSV formats.

---

### 5. B2B Customer Portal & Negotiation Workspace

_Client-facing workspace for friction-free quote reviews, inline line-item commenting, counter-proposals, and legal e-signatures._

![Customer Portal Registration](docs/screenshots/customer_portal_registration.jpg)

- **Tokenized Public Links**: Secure, passwordless or authenticated buyer access without requiring enterprise workspace logins.
- **Live Two-Way Negotiation**: Buyers propose alternate target discounts or quantities directly within the proposal interface.
- **Canvas E-Signature**: Legal acceptance capture with digital strokes, signatory title, IP address, and timestamp.

---

## 👥 User Roles & RBAC Matrix

DealFlow360 implements strict multi-tenant Role-Based Access Control (RBAC) across five specialized profiles:

| System Capability                          | 👑 Admin (RevOps) | 👔 Sales Rep | 🎖️ Sales Manager |   💼 Finance Ops   | 🤝 Customer (Buyer)  |
| :----------------------------------------- | :---------------: | :----------: | :--------------: | :----------------: | :------------------: |
| **Catalog & Products Management**          |     Full CRUD     |  View Only   |    View Only     |     View Only      |   Assigned Catalog   |
| **Customer Tier & Ceiling Governance**     |     Full CRUD     |  View Only   |    View Only     |     View Only      |    View Own Tier     |
| **Quote Creation & Line Discounting**      |      ✅ Full      |   ✅ Full    |     ✅ Full      |     View Only      | View / Counter-Offer |
| **Auto-Approved Gating (0 Hops)**          |        ✅         |      ✅      |        ✅        |         —          |          —           |
| **Tier 1 Approvals (Sales Manager)**       |        ✅         |      —       |     ✅ Full      |         —          |          —           |
| **Tier 2 High-Risk Approvals (Finance)**   |        ✅         |      —       |        —         |      ✅ Full       |          —           |
| **Deal Health Telemetry & Anomalies**      |     ✅ Global     | 👤 Own Deals |  👥 Team Deals   |   📊 Global Desk   |          —           |
| **Interactive Escalation Simulator**       |        ✅         |      ✅      |        ✅        |         ✅         |          —           |
| **Warehouse Shipping & Split Dispatch**    |        ✅         | View Status  |   View Status    | ✅ Full Management |  🚚 Track Shipments  |
| **Invoices, Subscriptions & Credit Notes** |        ✅         | View Status  |   View Status    | ✅ Full Management | 💳 Pay / View Bills  |
| **Digital Canvas E-Signature**             |         —         |      —       |        —         |         —          |    ✍️ Legal Sign     |

---

## 🧩 Core Platform Modules

### Module 1: Smart CPQ & Product Catalog

- **Attribute-Based Variants**: Manage dimensional attributes (RAM, SSD, Port counts, SLA commitments) with custom pricing and cost deltas.
- **Multi-Currency Price Lists**: Support currency rate schedules (INR, USD, EUR) associated with customer enterprise tiers.
- **Cross-Sell & Upsell Recommender**: Margin-aware product pairing rules automatically suggest complementary items during proposal creation.

### Module 2: Blended Risk & Margin Protection Engine

- **Deterministic Ceiling Gating**: Automatically computes the safety floor `MIN(Customer Tier Limit, Category Ceiling)` for every item.
- **Revenue-Weighted Scoring**: Avoids false alarms by weighting discount breaches against the line item's net revenue contribution.
- **Live COGS Calculation**: Real-time margin updates compare entered pricing against cost benchmarks on every keystroke.

### Module 3: Sequential Multi-Hop Approval Chains

- **Condition 1 (0 Hops 🟢)**: Safe deals with 0 risk points and discount $\le$ 5% are approved autonomously.
- **Condition 2 (1 Hop 🟡)**: Moderate exceptions route to the assigned Sales Manager with written justification.
- **Condition 3 (2 Hops 🔴)**: Deep discounts require sequential sign-off: first Sales Manager, then Finance Operations.
- **Immutable Audit Trail**: Logs actor identity, action type, timestamps, and revision comments for every review step.

### Module 4: Live Deal Escalation Simulator

- **Interactive RevOps Sandbox**: Real-time sliders allowing commercial directors to simulate discount %, risk score, and customer account tiers.
- **Instant Policy Verification**: Validates approval chain routing before rolling out new commercial policies to sales teams.

### Module 5: Deal Health & Anomaly Telemetry

- **Rep Baseline Variance**: Flags quotes with discounts deviating significantly from the representative's historical average.
- **Stalled Pipeline Detector**: Automatically flags proposals idling in `DRAFT` or `PENDING_APPROVAL` for more than 7 days.
- **SLA Delivery Slippage**: Alerts operators when scheduled fulfillment deadlines are approaching or past due.

### Module 6: B2B Customer Portal, Negotiation & E-Signature

- **Tokenized Access**: Clients open quotes through secure cryptographic tokens without complicated login requirements.
- **Line-Item Discussion**: Threaded commenting directly attached to specific quotation lines for targeted clarification.
- **Structured Counter-Proposals**: Buyers can propose alternate pricing and discount targets, triggering structured revision cycles.
- **HTML5 Canvas E-Signature**: Collects digital signatures with full legal audit metadata (IP address, user agent, signer identity).

### Module 7: Multi-Warehouse Split Fulfillment & Inventory

- **Multi-Depot Stock Tracking**: Tracks on-hand, reserved, and reorder levels across regional distribution hubs.
- **Shipping Cost Weight Optimization**: Routes shipments through warehouses with optimal cost factors.
- **Split Dispatch & Backorder Management**: Automatically creates split shipments for in-stock items and queues backorders for replenishment.

### Module 8: Billing, Recurring Subscriptions & Credit Notes

- **Automated AR Invoice Issuance**: Automatically creates invoices with configurable payment terms (Net 15, Net 30, Net 60, Due on Receipt).
- **SaaS Subscription Lifecycle**: Tracks MRR and ARR, handles billing intervals (monthly, quarterly, annual), and tracks contract renewals.
- **Mid-Cycle Credit Notes**: Generates credit adjustments for contract downgrades, cancellations, or negotiated billing concessions.

---

## 💎 Unique Selling Propositions (USPs)

1. **Active Margin Defense**: Stops profit erosion at quotation creation rather than discovering margin leakage after deals are finalized.
2. **Dual-Constraint Risk Intelligence**: Simultaneously enforces customer relationship entitlements (_who_) and product margin floors (_what_).
3. **Revenue-Weighted Fairness**: Prevents false positive roadblocks on low-cost accessories while strictly guarding high-ticket enterprise assets.
4. **Autonomous 0-Hop Velocity**: Gives reps the autonomy to close routine deals in seconds without unnecessary manager sign-offs.
5. **Collaborative Buyer Portal**: Replaces clunky PDF email attachments with an interactive online workspace for commenting, counter-proposals, and e-signing.
6. **Zero-Click Operational Handshake**: Automatically triggers warehouse inventory reservation and finance billing upon deal acceptance.

---

## 🛠️ Technology Stack

| Architecture Layer     | Technology               |   Version    | Purpose in DealFlow360                                                   |
| :--------------------- | :----------------------- | :----------: | :----------------------------------------------------------------------- |
| **Monorepo Engine**    | **Turborepo**            |   `^2.10`    | High-speed cached monorepo orchestration across all apps and packages    |
| **Frontend Framework** | **Next.js** (App Router) |    `16.3`    | Server Components, dynamic client actions, layout routing, and SSR       |
| **UI Library**         | **React**                |    `19.2`    | Core component architecture and responsive state management              |
| **Styling**            | **Tailwind CSS**         |    `v4.3`    | Modern, zero-runtime utility styling with design tokens                  |
| **Data Fetching**      | **TanStack React Query** |   `v5.67`    | Server-state caching, background data synchronization, and optimistic UI |
| **Analytics Charts**   | **Recharts**             |   `v3.10`    | Interactive pipeline stage donuts and revenue bar charts                 |
| **Mobile App**         | **React Native + Expo**  |   `SDK 52`   | Cross-platform mobile sales companion for reps on iOS and Android        |
| **Backend Framework**  | **Express.js**           |    `4.21`    | High-throughput REST API with modular routers and controller handlers    |
| **Runtime Language**   | **TypeScript**           |    `5.8`     | Monorepo-wide end-to-end type safety and interface contracts             |
| **Authentication**     | **Better-Auth**          |    `^1.1`    | Session management, password hashing, RBAC enforcement, and 2FA          |
| **Input Validation**   | **Zod**                  |    `^4.5`    | Strict schema validation on all incoming API request payloads            |
| **Database & ORM**     | **PostgreSQL + Prisma**  | `Prisma 6.4` | Relational modeling across 25+ domain models on Neon Serverless          |
| **Background Compute** | **BullMQ Worker**        |    `ESM`     | Asynchronous backorder allocation, heavy compute telemetry, and sync     |
| **Notifications**      | **Nodemailer**           |    `6.10`    | Automated quote delivery and 2FA OTPs via Gmail SMTP                     |

---

## 📁 Monorepo Directory Layout

```text
dealflow-odoo26/
├── apps/
│   ├── web/                     # Next.js 16 Web Dashboard & Customer Portal
│   │   ├── app/
│   │   │   ├── (auth)/          # User authentication (Login, Signup, 2FA)
│   │   │   ├── dashboard/
│   │   │   │   ├── (admin)/     # Executive Admin (Rules, Catalog, Reports)
│   │   │   │   ├── (manager)/   # Sales Manager (1-Hop Approvals, Team Quotas)
│   │   │   │   ├── (salesref)/  # Sales Rep (Proposal Builder, Deals)
│   │   │   │   └── (finance)/   # Finance & Ops (2-Hop Approvals, Billing, Logistics)
│   │   │   └── portal/          # Tokenized Customer Review & E-Signature
│   │   ├── lib/                 # Shared data fetching & client risk formulas
│   │   └── package.json
│   ├── api/                     # Express.js REST API Server
│   │   ├── src/
│   │   │   ├── config/          # Environment variables & SMTP setup
│   │   │   ├── controllers/     # Quotation, Billing, Fulfillment & Auth logic
│   │   │   ├── middleware/      # Better-Auth validation & error handlers
│   │   │   ├── routes/          # 21 modular Express route definitions
│   │   │   ├── schemas/         # Zod API validation schemas
│   │   │   └── services/        # Blended risk engine & business services
│   │   └── package.json
│   ├── expo-app/                # React Native Mobile Companion App
│   └── worker/                  # BullMQ background task processor
├── packages/
│   ├── db/                      # Prisma ORM schema, migrations & master seed
│   ├── ui/                      # Shared UI primitives & components
│   ├── eslint-config/           # Monorepo linting configurations
│   └── typescript-config/       # Base TypeScript configurations
├── docs/
│   └── screenshots/             # High-resolution platform preview screenshots
├── scripts/
│   └── seed.ts                  # Master multi-tenant database seeder (4 enterprises)
├── package.json                 # Monorepo root configuration
└── turbo.json                   # Turborepo task pipeline rules
```

---

## 🚀 Project Setup & Execution Guide

### Prerequisites

Ensure the following tools are installed on your machine:

- **Node.js**: `v22.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v10.0.0` or higher
- **Git**: For source control
- **PostgreSQL Database**: A local PostgreSQL instance or a free cloud database from [Neon](https://neon.tech/)

---

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/dealflow-odoo26.git
cd dealflow-odoo26
```

---

### Step 2: Install Dependencies

Install all monorepo dependencies across apps and shared packages:

```bash
npm install
```

---

### Step 3: Environment Variables Setup

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=4000
HOST="0.0.0.0"
NODE_ENV="development"

# Frontend Web Origin for CORS
WEB_ORIGIN="http://localhost:3000"

# Better Auth Configuration
BETTER_AUTH_SECRET="super-secret-better-auth-token-key-must-be-long-and-random"
BETTER_AUTH_URL="http://localhost:4000"

# PostgreSQL Connection (Neon Serverless or Local Postgres)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

# Optional: Gmail SMTP for Emailing Quotations & 2FA OTPs
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM="DealFlow360 <your-email@gmail.com>"
```

---

### Step 4: Database Synchronization

Generate the Prisma Client and synchronize models to your PostgreSQL database:

```bash
# Generate Prisma Client types
npm run db:generate

# Push schema directly to PostgreSQL
npm run db:push
```

---

### Step 5: Master Multi-Tenant Seeding

Populate the database with 4 complete enterprise organizations, product catalogs, customer tiers, discount governance rules, regional warehouses, stock inventory, and historical quotations:

```bash
npm run seed
# or
npm run db:seed
```

> **Seeded Enterprises**:
>
> 1. **Apex Enterprise Technologies** (INR / Global HQ)
> 2. **Nexus Cloud Systems** (USD / SaaS Platform)
> 3. **Vanguard Industrial Dynamics** (EUR / Industrial Hardware)
> 4. **Aegis Global Solutions** (INR / Enterprise Services)

---

### Step 6: Run Development Servers

Start the web dashboard and backend API server concurrently via Turborepo:

```bash
npm run dev
```

The application endpoints will be live at:

- 🌐 **Web Dashboard & Portal**: [http://localhost:3000](http://localhost:3000)
- ⚡ **Backend API Server**: [http://localhost:4000](http://localhost:4000)
- 🩺 **API Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

_(Optional: Launch individual workspaces)_

```bash
# Run only the Next.js Web App
npx turbo dev --filter=web

# Run only the Express API Server
npx turbo dev --filter=api
```

---

### Pre-Seeded Demo Accounts

All test accounts share the default password: `Password123!`

| Role                 | User Name     | Login Email                                                   | Purpose / Workspace View                                           |
| :------------------- | :------------ | :------------------------------------------------------------ | :----------------------------------------------------------------- |
| **👑 Admin**         | Alex Vance    | `admin@dealflow360.com`                                       | Full RevOps console, discount rules, reporting, catalog            |
| **🎖️ Sales Manager** | Elena Rostova | `manager@dealflow360.com`                                     | Tier 1 approvals, deal health radar, team quota tracking           |
| **💼 Finance & Ops** | Marcus Vance  | `finance@dealflow360.com`                                     | Tier 2 high-risk approvals, warehouse split shipments, AR invoices |
| **👔 Sales Rep**     | Alex Rivera   | `rep@dealflow360.com`                                         | Quotation proposal builder, line discounts, customer negotiation   |
| **🤝 Customer**      | Client Portal | _Access via direct token link on any sent quote, or register_ |

---

## 📡 API Route Reference

| Method | Endpoint                                         | Description                                                 | Auth Required  |
| :----- | :----------------------------------------------- | :---------------------------------------------------------- | :------------: |
| `POST` | `/api/auth/sign-in`                              | Authenticate user session with credentials                  |       No       |
| `GET`  | `/api/auth/me`                                   | Inspect active session, role profile, and tenant membership |      Yes       |
| `GET`  | `/api/products`                                  | Retrieve catalog items with category margin ceilings        |      Yes       |
| `GET`  | `/api/customer-tiers`                            | Retrieve customer tiers and discount ceilings               |      Yes       |
| `GET`  | `/api/discount-rules`                            | Retrieve approval routing thresholds and policies           |      Yes       |
| `GET`  | `/api/quotations`                                | List quotes with calculated risk scores and stages          |      Yes       |
| `POST` | `/api/quotations`                                | Create proposal (recalculates risk & margins in DB)         |      Yes       |
| `POST` | `/api/quotations/:id/submit-approval`            | Submit out-of-policy quote to approval chain                |      Yes       |
| `POST` | `/api/quotations/:id/send`                       | Email quote and secure portal link to customer              |      Yes       |
| `GET`  | `/api/approvals`                                 | List pending approval requests for Manager / Finance        |      Yes       |
| `POST` | `/api/approvals/:id/steps/:stepId/approve`       | Approve active step in sequential chain                     |      Yes       |
| `POST` | `/api/approvals/:id/steps/:stepId/reject`        | Reject active step with revision comments                   |      Yes       |
| `GET`  | `/api/portal/quotations/:token`                  | Public customer quote inspection view                       | No (Tokenized) |
| `POST` | `/api/portal/quotations/:token/accept`           | Customer digital e-signature acceptance                     | No (Tokenized) |
| `POST` | `/api/portal/quotations/:token/counter-proposal` | Customer structured counter-proposal                        | No (Tokenized) |
| `GET`  | `/api/fulfillment-orders`                        | View fulfillment orders, split shipments & backorders       |      Yes       |
| `POST` | `/api/shipments`                                 | Dispatch shipment package from designated warehouse         |      Yes       |
| `GET`  | `/api/invoices`                                  | List Accounts Receivable billing invoices                   |      Yes       |
| `GET`  | `/api/subscriptions`                             | List recurring SaaS subscriptions & ARR metrics             |      Yes       |
| `GET`  | `/api/deal-health/anomalies`                     | Telemetry flags for stalled deals & baseline breaches       |      Yes       |

---

## 📄 License & Acknowledgments

Distributed under the **MIT License**. See `LICENSE` for details.

Developed with pride for the **Odoo 26 Finale Hackathon** as a showcase of modern commercial excellence, precision margin protection, and frictionless B2B deal execution.

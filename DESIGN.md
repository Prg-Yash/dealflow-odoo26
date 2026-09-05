# Design System: DealFlow360 — "Luminous Horizon"

This document serves as the **single source of truth** for DealFlow360's visual design system, interface tokens, component architecture, and interaction standards. All developers, designers, and AI agents must follow these specifications when creating or modifying screens.

---

## 1. Visual Theme & Atmosphere

- **Design Philosophy:** **"Luminous Horizon"** — A clean, daylight enterprise operations aesthetic engineered for high-velocity CPQ (Configure, Price, Quote) and deal orchestration.
- **Atmosphere:** Airy, calm, and clinical yet distinctly warm. Replaces muddy skin/beige tones and dark terminal slop with a bright `#f9f9f9` daylight canvas, pure white card containers (`#ffffff`), crisp slate typography, and energetic coral-orange (`#ff5e3a`) accents.
- **Density Spectrum:** **Daily App Balanced (5/10)** — High information clarity without cockpit clutter. Generous whitespace around key metrics and deal tables; compact controls for line-item sliders and steppers.
- **Variance Spectrum:** **Offset Asymmetric (6/10)** — Balanced structural grids with offset sidebars (e.g. 8-column commercial canvas paired with a 4-column sticky financial margin card).
- **Motion Philosophy:** **Tactile Micro-Interactions (6/10)** — Subtle active push feedback (`active:translate-y-px`), live sync pulse animations, and smooth CSS cubic-bezier transitions (`150ms-200ms`). No dizzying full-page animations or jarring spring bounces.

---

## 2. Color Palette & Roles

The palette is strictly calibrated. Neutrals use an absolute Slate/Zinc base; one primary brand accent (`#ff5e3a`) is used for primary calls-to-action and active navigation states; distinct semantic tokens indicate deal health and governance levels.

### 2.1 Surfaces & Canvas (Daylight Foundation)
- **Canvas Background (`--color-surface`):** `#f9f9f9` — The clean off-white global background across all application views. Never pure `#ffffff` for full-page backgrounds.
- **Surface Dim (`--color-surface-dim`):** `#e2e8f0` — Recessed container areas and table headers.
- **Surface Lowest / Card (`--color-surface-container-lowest`):** `#ffffff` — Raised card containers, modals, and input fields.
- **Surface High (`--color-surface-container-high`):** `#f1f5f9` — Hover states on interactive rows and subtle pill chips.

### 2.2 Neutral Typography & Borders
- **Primary Ink (`--color-on-surface`):** `#0f172a` (Slate-900) — High-contrast text for headings, numbers, and primary labels. Never pure black (`#000000`).
- **Secondary Ink (`--color-on-surface-variant`):** `#64748b` (Slate-500) & `#475569` (Slate-600) — Supporting descriptions, table headers, breadcrumbs, and metadata.
- **Whisper Border (`--color-outline-variant`):** `#e2e8f0` (Slate-200) — 1px crisp structural borders on all cards, dividers, and table rows.
- **Focus Border (`--color-outline`):** `#cbd5e1` (Slate-300) — Inactive input outlines.

### 2.3 Primary Brand Accent
- **Coral Orange (`--color-primary-container`):** `#ff5e3a` — The primary brand signature. Used for primary buttons, active pill navigation, live pulse indicators, quotation numbers, and progress bar accents.
- **Coral Hover:** `#e04e2b` / `#ea4e28` — State feedback on hover.
- **Coral Focus Ring:** `rgba(255, 94, 58, 0.25)` — 3px-4px soft glow ring on focused inputs.
- **Coral Subtle Fill:** `rgba(255, 94, 58, 0.08)` (`bg-orange-50`) — Badges, warning cards, and draft indicators.

### 2.4 Semantic Deal & Governance Status
- **Emerald Green (Healthy / Auto-Approved / Confirmed PO):**
  - Text/Icon: `#059669` (Emerald-600) / `#047857` (Emerald-700)
  - Fill: `#ecfdf5` (Emerald-50) | Border: `#a7f3d0` (Emerald-200)
  - *Rule:* Indicates gross margin &ge; 45%, confirmed deals, and successful approvals.
- **Amber Gold (Negotiation / Tier 1 Manager Review):**
  - Text/Icon: `#d97706` (Amber-600) / `#b45309` (Amber-700)
  - Fill: `#fffbeb` (Amber-50) | Border: `#fde68a` (Amber-200)
  - *Rule:* Indicates gross margin 35%–45%, discounts &gt; 10%, or contract value &gt; $50,000.
- **Rose Red (Escalation / Tier 2 VP & Finance Review):**
  - Text/Icon: `#e11d48` (Rose-600) / `#be123c` (Rose-700)
  - Fill: `#fff1f2` (Rose-50) | Border: `#fecdd3` (Rose-200)
  - *Rule:* Indicates gross margin &lt; 35% or discounts &gt; 20%.
- **Sky Blue (Approved / Technical Specifications):**
  - Text/Icon: `#0284c7` (Sky-600) / `#0369a1` (Sky-700)
  - Fill: `#f0f9ff` (Sky-50) | Border: `#bae6fd` (Sky-200)

---

## 3. Typography Architecture

### 3.1 Font Families
- **Primary Interface (Sans-Serif):** `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`
  - High legibility with geometric humanist curves.
  - Used for all interface headings, navigation tabs, buttons, forms, and descriptions.
- **Monospace Figures & Codes:** `"Geist Mono", "JetBrains Mono", monospace`
  - Used strictly for currency values (`$68,500.00`), quote identifiers (`Q-1042`), percentages (`48.6%`), timestamps, and financial line items.

### 3.2 Typographic Hierarchy
| Role | Size | Weight | Tracking | Case / Color |
|---|---|---|---|---|
| **Page Title (H1)** | `1.75rem` - `2rem` (28-32px) | Black / Extra-Bold (`800`) | `-0.025em` (tight) | Slate-900 (`#0f172a`) |
| **Section Header (H2)** | `1.125rem` - `1.25rem` (18-20px) | Bold (`700`) | `-0.015em` | Slate-900 (`#0f172a`) |
| **Card Title (H3)** | `0.875rem` (14px) | Bold (`700`) | `-0.01em` | Slate-900 (`#0f172a`) |
| **Body Standard** | `0.875rem` (14px) | Normal (`400`) / Medium (`500`) | Normal | Slate-700 (`#334155`) |
| **Body Compact / Descriptions** | `0.75rem` (12px) | Normal (`400`) / Medium (`500`) | Normal | Slate-500 (`#64748b`) |
| **Micro Labels / Table Headers** | `0.625rem` - `0.6875rem` (10-11px) | Bold (`700`) | `+0.05em` (wide) | Uppercase, Slate-500 |
| **Financial Figures (Large)** | `1.25rem` - `1.75rem` (20-28px) | Black (`900`) | Monospace | Slate-900 / Coral `#ff5e3a` |

---

## 4. Spacing & Elevation (8px Base Grid)

### 4.1 Spacing Scale
- `0.25rem` (4px) — Micro icon spacing, inner pill padding
- `0.5rem` (8px) — Input inner vertical padding, tight gap
- `0.75rem` (12px) — Standard element gaps in compact cards
- `1rem` (16px) — Card internal padding (mobile), standard form gap
- `1.5rem` (24px) — Card internal padding (desktop), section separation
- `2rem` (32px) — Grid gaps, header vertical rhythm
- `4rem` (64px) — Top navbar offset padding (`pt-20`)

### 4.2 Border Radii
- **Full Pills (`rounded-full`):** Buttons, navigation segmented tabs, status chips, search bars.
- **Card Containers (`rounded-2xl` / `1.25rem`):** All content panels, Kanban cards, tables, modals.
- **Form Inputs (`rounded-xl` / `0.75rem`):** Text inputs, selects, dropdowns, quantity stepper boxes.
- **Badges (`rounded-md` / `0.375rem`):** Category tags (`license`, `services`, `hardware`).

### 4.3 Shadows
- **Card Shadow:** `0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)`
- **Hover Shadow:** `0 2px 8px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.08)`
- **Glass Backdrop:** `backdrop-filter: blur(20px); background: rgba(255, 255, 255, 0.85);`

---

## 5. Core Modular Components (`@repo/ui`)

All developers should reuse components from `@repo/ui` rather than recreating ad-hoc markup:

### 5.1 `SalesNav`
- **Role:** Persistent fixed top bar with frosted glass backdrop (`bg-white/90 backdrop-blur-xl`).
- **Features:**
  - Integrated `BrandLogo` linking to `/dashboard`.
  - Segmented pill navigation (`Dashboard`, `Quotations`, `+ New Quote`) with active orange slide background.
  - Live Sync animated pulse badge (`#10b981`).
  - Search bar with pill radius and quick shortcut icons.
  - User avatar with initials circle and role descriptor.

### 5.2 `PipelineStageBar`
- **Role:** 5-stage stacked visual pipeline progress bar.
- **Stages:** `Draft` &rarr; `Pending Approval` &rarr; `Approved` &rarr; `Negotiation` &rarr; `Confirmed / PO`.
- **Display:** Horizontal segmented bar weighted by stage deal volume, accompanied by columnar summary cards with stage colors and deal counts.

### 5.3 `ApprovalTracker`
- **Role:** Visual multi-node governance stepper.
- **Stages:** `Draft Created` (Sales Rep) &rarr; `Manager Approval` (Sales Director) &rarr; `Finance Verification` (FinOps) &rarr; `Customer Sign-off` (Buyer).
- **States:** Completed (green checkmark), Active (pulsing orange ring), Pending (neutral slate border).

### 5.4 `QuotationLineItems`
- **Role:** Commercial line items table supporting both editable and read-only modes.
- **Interactive Capabilities:**
  - Qty stepper controls (`-` / `+`) with min-validation.
  - Live discount slider (`0%` to `40%`) with immediate reactive percentage pill.
  - Category badges (`license`, `services`, `support`, `hardware`).
  - Catalog product drawer trigger (`+ Add from Catalog`) and custom deliverable builder (`+ Custom Item`).
  - Net contract sum calculation in footer.

### 5.5 `QuotationMarginCard`
- **Role:** Real-time financial economics and margin health engine.
- **Calculations & Visuals:**
  - Gross Subtotal &rarr; Negotiated Discounts &rarr; Net Contract Total &rarr; COGS &rarr; Gross Profit.
  - Live margin progress gauge bar:
    - `>45%`: Green / Healthy
    - `35%–45%`: Amber / Warning
    - `<35%`: Rose / Critical Escalation
  - Dynamic governance level detector:
    - *Auto-Approve*: Discount &le; 10% & Margin &ge; 45%
    - *Tier 1 Manager*: Discount &gt; 10% or Total &gt; $50K
    - *Tier 2 VP/Finance*: Discount &gt; 20% or Margin &lt; 35%
  - Direct actions: "Submit for Approval" and "Save as Draft".

### 5.6 `CatalogModal`
- **Role:** Fast product and services catalog picker drawer.
- **Features:** Search filter, category pill tabs, unit price vs cost basis indicators, standard margin badges, and quick "+ Add" action with momentary checkmark feedback.

---

## 6. Standard Layout Principles

1. **Max Width & Centering:**
   - All main application pages must be wrapped in `max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8`.
2. **Top Navigation Offset:**
   - Nav is fixed at `h-16`. Main canvas must start with `pt-20` to prevent content overlap.
3. **Quotation Canvas Grid:**
   - Standard 12-column grid on desktop (`lg:grid-cols-12 gap-6`).
   - Line items workspace occupies **8 columns** (`lg:col-span-8`).
   - Financial margin & governance card occupies **4 columns** (`lg:col-span-4 sticky top-24`).
4. **Responsive Collapse:**
   - On screens &lt; 1024px, 12-column layouts collapse to single-column stacking with margin summary below line items.
   - On mobile (&lt; 640px), tables switch to horizontal scroll wrappers (`overflow-x-auto`) to protect tabular financial data.

---

## 7. Anti-Patterns & Banned Implementations

To maintain a bespoke, high-grade enterprise aesthetic, the following patterns are **strictly forbidden**:

- ❌ **No Skin / Muddy Beige Backgrounds:** Never use tan, cream, or beige backgrounds. The surface is crisp daylight `#f9f9f9`.
- ❌ **No Neon / AI Purple Gradients:** No purple glow effects, no neon drop-shadows, and no generic dark-mode cyberpunk gradients.
- ❌ **No Pure Black (`#000000`):** Use Slate-900 (`#0f172a`) for maximum contrast without harshness.
- ❌ **No Ad-Hoc Copy-Pasted Tables:** Use `@repo/ui`'s `QuotationLineItems` instead of building custom tables for quotes.
- ❌ **No Generic Emojis:** Use featherweight SVG icons from `lucide-react` with precise sizes (`12px` to `18px`).
- ❌ **No Missing Unit Prices or Margins:** Always display cost basis and margin metrics on commercial deliverables.
- ❌ **No Unstyled Alert Modals:** Use `@repo/ui`'s `Modal` component with backdrop blur for dialogs and confirmations.
- ❌ **No Hardcoded Role Routings:** Use the centralized roles module (`lib/roles.ts`) for permission checks and persona switching.

---

## 8. Developer Quick Reference

### Colors & Classes Cheat Sheet
```tsx
// Backgrounds
bg-[#f9f9f9]          // Page canvas background
bg-white              // Card & container surface
bg-slate-50           // Recessed table headers, subtle wells

// Borders
border-slate-200      // Standard card and container borders
border-slate-100      // Inner row dividers

// Brand Accent
bg-[#ff5e3a]          // Primary button / active state
hover:bg-[#e04e2b]    // Hover transition
text-[#ff5e3a]        // Highlighted totals / numbers

// Typography
text-[#0f172a]        // Primary headings & values
text-slate-600        // Secondary labels & metadata
font-mono             // For all $ amounts, IDs, and % stats
```

### Importing Modular Components
```tsx
import {
  SalesNav,
  PipelineStageBar,
  ApprovalTracker,
  QuotationLineItems,
  QuotationMarginCard,
  CatalogModal,
  Badge,
  Button,
  Modal,
} from "@repo/ui";
```

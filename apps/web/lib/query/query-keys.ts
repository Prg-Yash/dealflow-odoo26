/**
 * Centralized Hierarchical Query Key Factory for TanStack Query v5.
 * Enables granular cache invalidation and reliable cache targeting.
 */

export const queryKeys = {
  // Organizations & Workspace Context
  organizations: {
    all: ["organizations"] as const,
    current: () => [...queryKeys.organizations.all, "current"] as const,
    list: () => [...queryKeys.organizations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.organizations.all, "detail", id] as const,
  },

  // Users & Staff
  users: {
    all: ["users"] as const,
    me: () => [...queryKeys.users.all, "me"] as const,
    list: (role?: string) => [...queryKeys.users.all, "list", { role }] as const,
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
    salesReps: () => [...queryKeys.users.all, "reps"] as const,
    salesManagers: () => [...queryKeys.users.all, "managers"] as const,
  },

  // Customers & Tiers
  customers: {
    all: ["customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    tiers: () => [...queryKeys.customers.all, "tiers"] as const,
  },

  // Product Catalog, Pricing & Inventory
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters?: { categoryId?: string; search?: string }) => [...queryKeys.products.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.products.all, "detail", id] as const,
    categories: () => [...queryKeys.products.all, "categories"] as const,
    priceLists: () => [...queryKeys.products.all, "price-lists"] as const,
    recommendations: (productId?: string) => [...queryKeys.products.all, "recommendations", productId] as const,
    stockLevels: (productId?: string) => [...queryKeys.products.all, "stock", productId] as const,
  },

  // Quotation & Deal Pipeline
  quotations: {
    all: ["quotations"] as const,
    lists: () => [...queryKeys.quotations.all, "list"] as const,
    list: (filters?: { stage?: string; customerId?: string; salesRepId?: string; search?: string }) =>
      [...queryKeys.quotations.lists(), filters] as const,
    details: () => [...queryKeys.quotations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
    lines: (id: string) => [...queryKeys.quotations.detail(id), "lines"] as const,
    comments: (id: string) => [...queryKeys.quotations.detail(id), "comments"] as const,
    counterProposals: (id: string) => [...queryKeys.quotations.detail(id), "counter-proposals"] as const,
    approvalRequest: (id: string) => [...queryKeys.quotations.detail(id), "approval-request"] as const,
    pipelineStats: () => [...queryKeys.quotations.all, "stats"] as const,
  },

  // Discount Governance & Approvals
  approvals: {
    all: ["approvals"] as const,
    pending: () => [...queryKeys.approvals.all, "pending"] as const,
    history: (filters?: Record<string, any>) => [...queryKeys.approvals.all, "history", filters] as const,
    detail: (id: string) => [...queryKeys.approvals.all, "detail", id] as const,
    rules: () => [...queryKeys.approvals.all, "rules"] as const,
  },

  // Warehouses & Split Fulfillment
  fulfillment: {
    all: ["fulfillment"] as const,
    orders: (filters?: Record<string, any>) => [...queryKeys.fulfillment.all, "orders", filters] as const,
    orderDetail: (id: string) => [...queryKeys.fulfillment.all, "order", id] as const,
    shipments: (filters?: Record<string, any>) => [...queryKeys.fulfillment.all, "shipments", filters] as const,
    backorders: () => [...queryKeys.fulfillment.all, "backorders"] as const,
    warehouses: () => [...queryKeys.fulfillment.all, "warehouses"] as const,
  },

  // Invoicing, Subscriptions & Accounts Receivable
  billing: {
    all: ["billing"] as const,
    invoices: (filters?: { status?: string; customerId?: string }) =>
      [...queryKeys.billing.all, "invoices", filters] as const,
    invoiceDetail: (id: string) => [...queryKeys.billing.all, "invoice", id] as const,
    subscriptions: (filters?: { status?: string; customerId?: string }) =>
      [...queryKeys.billing.all, "subscriptions", filters] as const,
    subscriptionDetail: (id: string) => [...queryKeys.billing.all, "subscription", id] as const,
    creditNotes: (customerId?: string) => [...queryKeys.billing.all, "credit-notes", customerId] as const,
    stats: () => [...queryKeys.billing.all, "stats"] as const,
  },

  // Customer Negotiation Portal (Token-scoped)
  portal: {
    all: ["portal"] as const,
    quote: (token: string) => [...queryKeys.portal.all, "quote", token] as const,
    comments: (token: string) => [...queryKeys.portal.quote(token), "comments"] as const,
    counterProposals: (token: string) => [...queryKeys.portal.quote(token), "counter-proposals"] as const,
  },
} as const;

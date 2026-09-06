"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "VOID";
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  amountPaid: number;
  paymentTerms: string;
  issueDate: string;
  dueDate: string;
  customerId: string;
  customer?: { id: string; name: string; email: string; companyName?: string };
  quotationId?: string | null;
  subscriptionId?: string | null;
  lines?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    discountPercent?: number;
    isRecurring?: boolean;
    product?: { name: string; sku: string };
  }>;
  payments?: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    status: string;
    paidAt: string;
    paymentMethod: string;
  }>;
  createdAt: string;
}

export interface SubscriptionLineData {
  id: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  recurringAmount: number;
  product?: { id: string; name: string; sku: string; basePrice: number; costPrice: number };
  variant?: { id: string; attributeName: string; attributeValue: string };
}

export interface SubscriptionData {
  id: string;
  subscriptionNumber: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  billingInterval: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  currentMrr: number;
  currentArr: number;
  autoRenew: boolean;
  notes?: string | null;
  customerId: string;
  customer?: { id: string; name: string; email: string; companyName?: string; tier?: { name: string } };
  quotationId?: string | null;
  quotation?: {
    id: string;
    quoteNumber: string;
    title?: string;
    lines?: Array<{
      id: string;
      itemType: "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
      quantity: number;
      unitPrice: number;
      netPrice: number;
      description?: string | null;
      product?: { id: string; name: string; sku: string };
    }>;
  };
  lines?: SubscriptionLineData[];
  invoices?: InvoiceData[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch invoices list
 */
export function useInvoices(filters?: { status?: string; customerId?: string }) {
  return useQuery({
    queryKey: queryKeys.billing.invoices(filters),
    queryFn: () => api.get<InvoiceData[]>("/api/invoices", { params: filters }),
  });
}

/**
 * Hook to fetch single invoice
 */
export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.billing.invoiceDetail(id),
    queryFn: () => api.get<InvoiceData>(`/api/invoices/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch subscriptions list
 */
export function useSubscriptions(filters?: { status?: string; customerId?: string }) {
  return useQuery({
    queryKey: queryKeys.billing.subscriptions(filters),
    queryFn: () => api.get<SubscriptionData[]>("/api/subscriptions", { params: filters }),
  });
}

/**
 * Hook to fetch single subscription
 */
export function useSubscription(id: string) {
  return useQuery({
    queryKey: queryKeys.billing.subscriptionDetail(id),
    queryFn: () => api.get<SubscriptionData>(`/api/subscriptions/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Mutation: Create a new Subscription Plan / Schedule (Admin / Finance)
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      customerId: string;
      productId: string;
      variantId?: string | null;
      planName?: string;
      billingInterval?: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
      unitPrice: number;
      quantity?: number;
      discountPercent?: number;
      startDate?: string;
      notes?: string;
      autoRenew?: boolean;
      enableReminder?: boolean;
    }) => api.post<SubscriptionData>("/api/subscriptions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptions() });
    },
  });
}

/**
 * Mutation: Modify subscription details, billing schedule, or pause/resume
 */
export function useModifySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        billingInterval?: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
        status?: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
        nextBillingDate?: string;
        autoRenew?: boolean;
        notes?: string;
        quantity?: number;
        unitPrice?: number;
        discountPercent?: number;
      };
    }) => api.patch<SubscriptionData>(`/api/subscriptions/${id}`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptionDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptions() });
    },
  });
}

/**
 * Mutation: Trigger/Schedule BullMQ renewal reminder
 */
export function useScheduleReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      reminderDaysBefore = 7,
      manualTrigger = true,
    }: {
      subscriptionId: string;
      reminderDaysBefore?: number;
      manualTrigger?: boolean;
    }) =>
      api.post(`/api/subscriptions/${subscriptionId}/schedule-reminder`, {
        reminderDaysBefore,
        manualTrigger,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.subscriptionDetail(variables.subscriptionId),
      });
    },
  });
}

/**
 * Mutation: Record payment on invoice
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      body,
    }: {
      invoiceId: string;
      body: { amount: number; paymentMethod?: string; transactionRef?: string };
    }) => api.post(`/api/invoices/${invoiceId}/payments`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.invoiceDetail(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.invoices() });
    },
  });
}

/**
 * Mutation: Cancel active subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, refundRule }: { id: string; reason?: string; refundRule?: "PRORATED" | "FULL" | "NO_REFUND" }) =>
      api.post(`/api/subscriptions/${id}/cancel`, { reason, refundRule }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptionDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

/**
 * Mutation: Update subscription line seat quantity (mid-cycle proration)
 */
export function useUpdateSubscriptionLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      lineId,
      quantity,
    }: {
      subscriptionId: string;
      lineId: string;
      quantity: number;
    }) =>
      api.patch(`/api/subscriptions/${subscriptionId}/lines/${lineId}`, { quantity }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptionDetail(variables.subscriptionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscriptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.invoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

/**
 * Mutation: Generate decoupled hybrid billing for a quotation
 */
export function useGenerateHybridBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { quotationId: string; billingInterval?: string; notes?: string }) =>
      api.post("/api/billing/generate", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

/**
 * Mutation: Generate invoice on shipment dispatch
 */
export function useGenerateShipmentInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { shipmentId: string }) =>
      api.post("/api/billing/shipment-invoice", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
    },
  });
}


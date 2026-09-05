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
  customer?: { id: string; name: string; email: string };
  quotationId?: string | null;
  subscriptionId?: string | null;
  lines?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    netAmount: number;
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
  customerId: string;
  quotationId?: string | null;
  customer?: { id: string; name: string; email: string };
  lines?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    recurringAmount: number;
    product?: { name: string; sku: string };
  }>;
  createdAt: string;
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


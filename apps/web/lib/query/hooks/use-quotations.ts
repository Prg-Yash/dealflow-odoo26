"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticUpdateItemInList,
  optimisticAppendItem,
} from "../optimistic-helpers";

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  productId: string;
  variantId?: string | null;
  itemType: "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
  description: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  netPrice: number;
  lineMargin: number;
  lineMarginPercent: number;
  isCeilingBreached: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: { id: string; name: string; type: string };
  };
}

export interface QuotationSummary {
  id: string;
  quoteNumber: string;
  title: string;
  stage: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "NEGOTIATION" | "CONFIRMED" | "CANCELLED";
  subtotal: number;
  discountTotal: number;
  discountPercent?: number;
  notes?: string | null;
  taxTotal: number;
  grandTotal: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  blendedRiskScore: number;
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  portalToken?: string | null;
  expiresAt?: string | null;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
    tier?: { id: string; name: string; code?: string; discountCeiling: number } | null;
  };
  salesRepId: string;
  salesRep?: { id: string; user?: { name: string; email: string } };
  approvalRequest?: {
    id: string;
    status: string;
    currentStep: number;
    escalationLevel?: string;
    blendedRiskScore?: number;
    steps?: Array<{
      id: string;
      stepNumber: number;
      level: string;
      status: string;
      reviewerId?: string | null;
      comments?: string | null;
      actionedAt?: string | null;
    }>;
  } | null;
  lines?: QuotationLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationComment {
  id: string;
  quotationId: string;
  quotationLineId?: string | null;
  authorId: string;
  authorRole: string;
  message: string;
  proposedDiscountPercent?: number | null;
  isResolved: boolean;
  createdAt: string;
  author?: { name: string; email: string };
}

/**
 * Hook to fetch paginated or filtered quotations list
 */
export function useQuotations(filters?: { stage?: string; customerId?: string; salesRepId?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.quotations.list(filters),
    queryFn: () => api.get<QuotationSummary[]>("/api/quotations", { params: filters }),
  });
}

/**
 * Hook to fetch a single quotation with full line items and calculation breakdown
 */
export function useQuotation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: () => api.get<QuotationSummary>(`/api/quotations/${id}`),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * Hook to fetch live upsell & cross-sell suggestions for a quotation
 */
export function useUpsellSuggestions(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.recommendations(id),
    queryFn: () => api.get<any[]>(`/api/quotations/${id}/upsell-suggestions`),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * Mutation: Create a new draft quotation
 */
export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      customerId: string;
      title?: string;
      expiresAt?: string;
      notes?: string;
      termsAndConditions?: string;
      lines?: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        unitPrice?: number;
        discountPercent?: number;
        description?: string;
      }>;
    }) => api.post<QuotationSummary>("/api/quotations", body),
    onSuccess: (newQuote) => {
      queryClient.setQueriesData<QuotationSummary[]>(
        { queryKey: queryKeys.quotations.lists() },
        (old) => (old ? [newQuote, ...old] : [newQuote])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

/**
 * Optimistic Mutation: Moves a deal between pipeline stages (e.g. Kanban Drag-and-Drop)
 */
export function useUpdateQuotationStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: QuotationSummary["stage"] }) =>
      api.patch<QuotationSummary>(`/api/quotations/${id}/stage`, { stage }),

    ...createOptimisticMutationOptions<{ id: string; stage: QuotationSummary["stage"] }, QuotationSummary[]>({
      queryClient,
      queryKey: queryKeys.quotations.lists(),
      updateFn: (oldList, { id, stage }) => optimisticUpdateItemInList(oldList, id, { stage }),
      additionalInvalidations: [queryKeys.quotations.pipelineStats()],
    }),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.pipelineStats() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.id) });
      }
    },
  });
}

/**
 * Mutation: Add a line item to an existing quotation
 */
export function useAddQuotationLine(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice?: number;
      discountPercent?: number;
      description?: string;
    }) => api.post<QuotationSummary>(`/api/quotations/${quotationId}/lines`, body),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotations.detail(quotationId), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
    },
  });
}

/**
 * Mutation: Update a quotation line item (quantity, discount, pricing)
 */
export function useUpdateQuotationLine(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lineId,
      body,
    }: {
      lineId: string;
      body: { quantity?: number; unitPrice?: number; discountPercent?: number; description?: string };
    }) => api.patch<QuotationSummary>(`/api/quotations/${quotationId}/lines/${lineId}`, body),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotations.detail(quotationId), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
    },
  });
}

/**
 * Mutation: Delete a line item from a quotation
 */
export function useDeleteQuotationLine(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lineId: string) =>
      api.delete<QuotationSummary>(`/api/quotations/${quotationId}/lines/${lineId}`),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotations.detail(quotationId), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
    },
  });
}

/**
 * Mutation: Submit quotation for approval evaluation
 */
export function useSubmitQuotation(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<any>(`/api/quotations/${quotationId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

/**
 * Mutation: Confirm quotation (triggers billing and inventory orders)
 */
export function useConfirmQuotation(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body?: { billingInterval?: string; paymentTerms?: string; startDate?: string }) =>
      api.post<any>(`/api/quotations/${quotationId}/confirm`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
    },
  });
}

/**
 * Optimistic Mutation: Appends a line or deal comment to the negotiation thread
 */
export function useAddQuotationComment(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      message: string;
      quotationLineId?: string;
      proposedDiscountPercent?: number;
      authorRole?: string;
    }) => api.post<QuotationComment>(`/api/quotations/${quotationId}/comments`, variables),

    ...createOptimisticMutationOptions<
      { message: string; quotationLineId?: string; proposedDiscountPercent?: number; authorRole?: string },
      QuotationComment[]
    >({
      queryClient,
      queryKey: queryKeys.quotations.comments(quotationId),
      updateFn: (oldComments, variables) => {
        const optimisticComment: QuotationComment = {
          id: `temp-${Date.now()}`,
          quotationId,
          quotationLineId: variables.quotationLineId ?? null,
          authorId: "current-user",
          authorRole: variables.authorRole ?? "SALES_REP",
          message: variables.message,
          proposedDiscountPercent: variables.proposedDiscountPercent ?? null,
          isResolved: false,
          createdAt: new Date().toISOString(),
          author: { name: "You", email: "" },
        };
        return optimisticAppendItem(oldComments, optimisticComment, "end");
      },
    }),
  });
}

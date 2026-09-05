"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticUpdateItemInList,
  optimisticAppendItem,
} from "../optimistic-helpers";

export interface QuotationSummary {
  id: string;
  quoteNumber: string;
  title: string;
  stage: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "NEGOTIATION" | "CONFIRMED" | "CANCELLED";
  grandTotal: number;
  grossMargin: number;
  grossMarginPercent: number;
  blendedRiskScore: number;
  customerId: string;
  customer?: { id: string; name: string; email: string };
  salesRepId: string;
  salesRep?: { id: string; user?: { name: string; email: string } };
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
export function useQuotations(filters?: { stage?: string; customerId?: string; search?: string }) {
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
    queryFn: () => api.get<any>(`/api/quotations/${id}`),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * Optimistic Mutation: Moves a deal between pipeline stages (e.g. Kanban Drag-and-Drop)
 * Instantly updates the cached list and single deal views, rolling back on network failure.
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

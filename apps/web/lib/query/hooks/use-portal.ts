"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticAppendItem,
} from "../optimistic-helpers";

export interface PortalLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  netPrice: number;
  itemType?: "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
  product?: {
    name: string;
    sku: string;
    category?: { name: string; type: string };
  };
}

export interface PortalComment {
  id: string;
  message: string;
  authorRole: string;
  createdAt: string;
  quotationLineId?: string | null;
  author?: { name: string; email: string; role?: string };
}

export interface PortalCounterProposal {
  id: string;
  proposedGrandTotal: number;
  proposedDiscountPercent: number;
  customerNotes?: string | null;
  status: string;
  createdAt: string;
  respondedBy?: { name: string } | null;
}

export interface PortalQuoteData {
  id: string;
  quoteNumber: string;
  title: string;
  stage: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  grossMargin?: number;
  grossMarginPercent?: number;
  expiresAt?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    email: string;
    tier?: { name: string; code: string; discountCeiling: number };
  };
  salesRep?: {
    id: string;
    user?: { name: string; email: string; image?: string };
  };
  organization?: {
    id: string;
    name: string;
    currency: string;
  };
  lines: PortalLineItem[];
  comments: PortalComment[];
  counterProposals: PortalCounterProposal[];
  signature?: {
    signedByName: string;
    signedAt: string;
    signatureData?: string;
  } | null;
}

/**
 * Hook to fetch customer portal quotation by secure portal token
 */
export function usePortalQuote(portalToken: string) {
  return useQuery({
    queryKey: queryKeys.portal.quote(portalToken),
    queryFn: () => api.get<PortalQuoteData>(`/api/portal/${portalToken}`),
    enabled: Boolean(portalToken),
    retry: 1,
  });
}

/**
 * Optimistic Mutation: Customer submits a counter-proposal
 */
export function useSubmitCounterProposal(portalToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      proposedGrandTotal: number;
      proposedDiscountPercent: number;
      customerNotes?: string;
    }) => api.post(`/api/portal/${portalToken}/counter-proposals`, variables),

    ...createOptimisticMutationOptions<
      { proposedGrandTotal: number; proposedDiscountPercent: number; customerNotes?: string },
      PortalQuoteData
    >({
      queryClient,
      queryKey: queryKeys.portal.quote(portalToken),
      updateFn: (oldQuote, variables) => {
        if (!oldQuote) return oldQuote as any;
        const optimisticProposal: PortalCounterProposal = {
          id: `temp-${Date.now()}`,
          proposedGrandTotal: variables.proposedGrandTotal,
          proposedDiscountPercent: variables.proposedDiscountPercent,
          customerNotes: variables.customerNotes ?? null,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        return {
          ...oldQuote,
          stage: "NEGOTIATION",
          counterProposals: optimisticAppendItem(oldQuote.counterProposals || [], optimisticProposal, "start"),
        };
      },
    }),
  });
}

/**
 * Optimistic Mutation: Customer posts a line or proposal-level comment
 */
export function useSubmitPortalComment(portalToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { message: string; quotationLineId?: string }) =>
      api.post(`/api/portal/${portalToken}/comments`, variables),

    ...createOptimisticMutationOptions<{ message: string; quotationLineId?: string }, PortalQuoteData>({
      queryClient,
      queryKey: queryKeys.portal.quote(portalToken),
      updateFn: (oldQuote, variables) => {
        if (!oldQuote) return oldQuote as any;
        const optimisticComment: PortalComment = {
          id: `temp-${Date.now()}`,
          message: variables.message,
          authorRole: "CUSTOMER",
          quotationLineId: variables.quotationLineId ?? null,
          createdAt: new Date().toISOString(),
          author: { name: oldQuote.customer?.name || "You", email: oldQuote.customer?.email || "" },
        };
        return {
          ...oldQuote,
          comments: optimisticAppendItem(oldQuote.comments || [], optimisticComment, "end"),
        };
      },
    }),
  });
}

/**
 * Mutation: Customer signs and confirms quotation
 */
export function useSignQuotation(portalToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      signedByName: string;
      signedByEmail: string;
      signatureData: string;
    }) => api.post(`/api/portal/${portalToken}/sign`, variables),

    ...createOptimisticMutationOptions<
      { signedByName: string; signedByEmail: string; signatureData: string },
      PortalQuoteData
    >({
      queryClient,
      queryKey: queryKeys.portal.quote(portalToken),
      updateFn: (oldQuote, variables) => {
        if (!oldQuote) return oldQuote as any;
        return {
          ...oldQuote,
          stage: "CONFIRMED",
          signature: {
            signedByName: variables.signedByName,
            signedAt: new Date().toISOString(),
            signatureData: variables.signatureData,
          },
        };
      },
    }),
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticAppendItem,
} from "../optimistic-helpers";

export interface PortalQuoteData {
  id: string;
  quoteNumber: string;
  title: string;
  stage: string;
  grandTotal: number;
  subtotal: number;
  discountTotal: number;
  taxTotal?: number;
  customer?: {
    id: string;
    name: string;
    email: string;
    tier?: {
      id: string;
      name: string;
      discountCeiling: number;
    } | null;
  };
  salesRep?: {
    id: string;
    user?: {
      name: string;
      email: string;
    };
  } | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    netPrice: number;
    billingCadence?: string;
    isRecurring?: boolean;
    product?: {
      name: string;
      category?: {
        name: string;
      };
    };
    comments: Array<{
      id: string;
      message: string;
      authorRole: string;
      authorName?: string;
      createdAt: string;
    }>;
  }>;
  comments: Array<{
    id: string;
    message: string;
    authorRole: string;
    authorName?: string;
    quotationLineId?: string | null;
    createdAt: string;
  }>;
  counterProposals: Array<{
    id: string;
    proposedGrandTotal: number;
    proposedDiscountPercent: number;
    customerNotes?: string | null;
    status: string;
    respondedBy?: string | null;
    createdAt: string;
  }>;
  signature?: {
    signedByName: string;
    signedAt: string;
  } | null;
}

/**
 * Hook to fetch customer portal quotation by secure portal token
 */
export function usePortalQuote(portalToken: string) {
  return useQuery({
    queryKey: queryKeys.portal.quote(portalToken),
    queryFn: async () => {
      const res = await api.get<any>(`/api/portal/${portalToken}`);
      return (res?.data || res) as PortalQuoteData;
    },
    enabled: Boolean(portalToken),
  });
}

/**
 * Mutation: Customer adds a line-level or quote-level comment / question
 */
export function useAddPortalComment(portalToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      message: string;
      quotationLineId?: string;
      authorName?: string;
      authorEmail?: string;
      proposedDiscountPercent?: number;
    }) => api.post(`/api/portal/${portalToken}/comments`, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.quote(portalToken) });
    },
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
    }) => api.post(`/api/portal/${portalToken}/counter-proposal`, variables),

    ...createOptimisticMutationOptions<
      { proposedGrandTotal: number; proposedDiscountPercent: number; customerNotes?: string },
      PortalQuoteData
    >({
      queryClient,
      queryKey: queryKeys.portal.quote(portalToken),
      updateFn: (oldQuote, variables) => {
        if (!oldQuote) return oldQuote as any;
        const optimisticProposal = {
          id: `temp-${Date.now()}`,
          proposedGrandTotal: variables.proposedGrandTotal,
          proposedDiscountPercent: variables.proposedDiscountPercent,
          customerNotes: variables.customerNotes ?? null,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        return {
          ...oldQuote,
          counterProposals: optimisticAppendItem(oldQuote.counterProposals, optimisticProposal, "start"),
        };
      },
    }),
  });
}

/**
 * Mutation: Customer confirms quotation with one click
 */
export function useConfirmQuotation(portalToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables?: {
      customerName?: string;
      customerEmail?: string;
      agreedToTerms?: boolean;
      notes?: string;
    }) => api.post(`/api/portal/${portalToken}/confirm`, variables || { agreedToTerms: true }),

    ...createOptimisticMutationOptions<
      { customerName?: string; customerEmail?: string; agreedToTerms?: boolean; notes?: string } | undefined,
      PortalQuoteData
    >({
      queryClient,
      queryKey: queryKeys.portal.quote(portalToken),
      updateFn: (oldQuote) => {
        if (!oldQuote) return oldQuote as any;
        return {
          ...oldQuote,
          stage: "CONFIRMED",
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
          },
        };
      },
    }),
  });
}

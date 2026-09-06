"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticAppendItem,
  optimisticUpdateItemInList,
  optimisticRemoveItemFromList,
} from "../optimistic-helpers";

export interface DiscountApprovalRuleData {
  id: string;
  name: string;
  minDiscount?: number;
  maxDiscount?: number;
  minDiscountPercent?: number;
  maxDiscountPercent?: number;
  minRiskScore?: number;
  maxRiskScore?: number;
  minBlendedRiskScore?: number;
  maxBlendedRiskScore?: number;
  escalationLevel?: "NONE" | "SALES_MANAGER" | "FINANCE" | "SALES_MANAGER_AND_FINANCE";
  requiresManagerApproval?: boolean;
  requiresFinanceApproval?: boolean;
  priority?: number;
  isActive?: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type DiscountRuleData = DiscountApprovalRuleData;

export interface DealAnomalyData {
  quotationId: string;
  quoteNumber: string;
  title: string;
  repId: string;
  repName: string;
  customerName: string;
  discountPercent: number;
  repHistoricalAvgDiscount: number;
  discountDeviation: number;
  isHighDiscountAnomaly: boolean;
  isStalledAnomaly: boolean;
  daysSinceLastActivity: number;
  blendedRiskScore: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
}

/**
 * Hook to fetch discount approval rules
 */
export function useDiscountRules() {
  return useQuery({
    queryKey: queryKeys.approvals.rules(),
    queryFn: () => api.get<DiscountApprovalRuleData[]>("/api/discount-approval-rules"),
  });
}

/**
 * Hook to fetch discount anomalies
 */
export function useDealAnomalies(filters?: { minDeviation?: number; asOfDate?: string }) {
  return useQuery({
    queryKey: [...queryKeys.approvals.all, "anomalies", filters],
    queryFn: () => api.get<{ count: number; anomalies: DealAnomalyData[] }>("/api/deal-health/anomalies", { params: filters }),
  });
}

/**
 * Hook to fetch stalled quotations
 */
export function useStalledQuotations(filters?: { thresholdDays?: number }) {
  return useQuery({
    queryKey: [...queryKeys.approvals.all, "stalled", filters],
    queryFn: () => api.get<any>("/api/deal-health/stalled", { params: filters }),
  });
}

/**
 * Mutation: Create discount approval rule
 */
export function useCreateDiscountRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Partial<DiscountApprovalRuleData> & { name: string }) =>
      api.post<DiscountApprovalRuleData>("/api/discount-approval-rules", body),

    ...createOptimisticMutationOptions<
      Partial<DiscountApprovalRuleData> & { name: string },
      DiscountApprovalRuleData[]
    >({
      queryClient,
      queryKey: queryKeys.approvals.rules(),
      updateFn: (oldList, variables) => {
        const minDisc = variables.minDiscountPercent ?? variables.minDiscount ?? 0;
        const maxDisc = variables.maxDiscountPercent ?? variables.maxDiscount ?? 15;
        const minRisk = variables.minBlendedRiskScore ?? variables.minRiskScore ?? 0;
        const maxRisk = variables.maxBlendedRiskScore ?? variables.maxRiskScore ?? 10;
        const escalation = variables.escalationLevel ?? "SALES_MANAGER";

        const optimisticRule: DiscountApprovalRuleData = {
          id: `temp-${Date.now()}`,
          name: variables.name,
          minDiscountPercent: minDisc,
          maxDiscountPercent: maxDisc,
          minDiscount: minDisc,
          maxDiscount: maxDisc,
          minBlendedRiskScore: minRisk,
          maxBlendedRiskScore: maxRisk,
          minRiskScore: minRisk,
          maxRiskScore: maxRisk,
          escalationLevel: escalation,
          requiresManagerApproval: variables.requiresManagerApproval ?? (escalation !== "NONE"),
          requiresFinanceApproval: variables.requiresFinanceApproval ?? (escalation === "SALES_MANAGER_AND_FINANCE" || escalation === "FINANCE"),
          priority: variables.priority ?? 1,
          isActive: true,
          description: variables.description ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return optimisticAppendItem(oldList, optimisticRule, "start");
      },
    }),
  });
}

/**
 * Mutation: Update discount approval rule
 */
export function useUpdateDiscountRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<DiscountApprovalRuleData> }) =>
      api.patch<DiscountApprovalRuleData>(`/api/discount-approval-rules/${id}`, body),

    ...createOptimisticMutationOptions<{ id: string; body: Partial<DiscountApprovalRuleData> }, DiscountApprovalRuleData[]>({
      queryClient,
      queryKey: queryKeys.approvals.rules(),
      updateFn: (oldList, { id, body }) => optimisticUpdateItemInList(oldList, id, body),
    }),
  });
}

/**
 * Mutation: Delete discount approval rule
 */
export function useDeleteDiscountRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/discount-approval-rules/${id}`),

    ...createOptimisticMutationOptions<string, DiscountApprovalRuleData[]>({
      queryClient,
      queryKey: queryKeys.approvals.rules(),
      updateFn: (oldList, id) => optimisticRemoveItemFromList(oldList, id),
    }),
  });
}

/**
 * Mutation: Accept customer counter-proposal
 */
export function useAcceptCounterProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/api/counter-proposals/${id}/accept`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

/**
 * Mutation: Approve quotation step (Manager or Finance Ops)
 */
export function useApproveQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      api.post(`/api/quotations/${id}/approve`, { comments }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.id) });
      }
    },
  });
}

/**
 * Mutation: Reject quotation step (Manager or Finance Ops)
 */
export function useRejectQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/api/quotations/${id}/reject`, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.id) });
      }
    },
  });
}

/**
 * Mutation: Approve an active approval step on a quotation
 */
export function useApproveStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      comments = "Approved in full compliance with deal policy.",
    }: {
      quotationId: string;
      comments?: string;
    }) => api.post<any>(`/api/approvals/${quotationId}/approve`, { comments }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      if (variables.quotationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.quotationId) });
      }
    },
  });
}

export const useApproveQuotation = useApproveStep;

/**
 * Mutation: Reject / Request revision on an approval step
 */
export function useRejectStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      comments,
      lineAdjustments,
    }: {
      quotationId: string;
      comments: string;
      lineAdjustments?: Array<{ lineId: string; discountPercent?: number; unitPrice?: number; quantity?: number }>;
    }) => api.post<any>(`/api/approvals/${quotationId}/reject`, { comments, lineAdjustments }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      if (variables.quotationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.quotationId) });
      }
    },
  });
}

export const useRejectQuotation = useRejectStep;


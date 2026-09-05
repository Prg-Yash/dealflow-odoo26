"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticAppendItem,
  optimisticUpdateItemInList,
} from "../optimistic-helpers";

export interface CustomerTierData {
  id: string;
  code: string;
  name: string;
  discountCeiling: number;
  description?: string | null;
}

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  tierId: string;
  tier?: CustomerTierData;
  salesRepId?: string | null;
  salesRep?: {
    id: string;
    user?: { id: string; name: string; email: string };
  } | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  creditLimit?: number | null;
  _count?: { quotations: number; subscriptions?: number; invoices?: number };
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch customers list
 */
export function useCustomers(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => api.get<CustomerData[]>("/api/customers", { params: filters }),
  });
}

/**
 * Hook to fetch single customer by ID
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api.get<CustomerData>(`/api/customers/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch customer tiers
 */
export function useCustomerTiers() {
  return useQuery({
    queryKey: queryKeys.customers.tiers(),
    queryFn: () => api.get<CustomerTierData[]>("/api/customer-tiers"),
  });
}

/**
 * Mutation: Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      companyName?: string;
      phone?: string;
      tierId: string;
      salesRepId?: string;
      billingAddress?: string;
      shippingAddress?: string;
      creditLimit?: number;
    }) => api.post<CustomerData>("/api/customers", body),

    ...createOptimisticMutationOptions<
      { name: string; email: string; tierId: string; companyName?: string },
      CustomerData[]
    >({
      queryClient,
      queryKey: queryKeys.customers.lists(),
      updateFn: (oldList, variables) => {
        const optimisticCustomer: CustomerData = {
          id: `temp-${Date.now()}`,
          name: variables.name,
          email: variables.email,
          companyName: variables.companyName ?? null,
          tierId: variables.tierId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return optimisticAppendItem(oldList, optimisticCustomer, "start");
      },
    }),
  });
}

/**
 * Mutation: Update customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CustomerData> }) =>
      api.patch<CustomerData>(`/api/customers/${id}`, body),

    ...createOptimisticMutationOptions<{ id: string; body: Partial<CustomerData> }, CustomerData[]>({
      queryClient,
      queryKey: queryKeys.customers.lists(),
      updateFn: (oldList, { id, body }) => optimisticUpdateItemInList(oldList, id, body),
    }),
  });
}

/**
 * Mutation: Create customer tier
 */
export function useCreateCustomerTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; code?: string; discountCeiling: number; description?: string }) =>
      api.post<CustomerTierData>("/api/customer-tiers", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tiers() });
    },
  });
}

/**
 * Mutation: Update customer tier
 */
export function useUpdateCustomerTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<{ name: string; code: string; discountCeiling: number; description: string }> }) =>
      api.patch<CustomerTierData>(`/api/customer-tiers/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tiers() });
    },
  });
}

/**
 * Mutation: Delete customer tier
 */
export function useDeleteCustomerTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/customer-tiers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tiers() });
    },
  });
}

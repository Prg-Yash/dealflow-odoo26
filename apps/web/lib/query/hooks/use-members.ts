"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";
import {
  createOptimisticMutationOptions,
  optimisticAppendItem,
  optimisticRemoveItemFromList,
} from "../optimistic-helpers";

export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE_OPS" | "CUSTOMER";
  createdAt: string;
  user?: { id?: string; name?: string; email?: string } | null;
  salesRep?: { id: string; territory?: string; commissionRate?: number } | null;
  salesManager?: { id: string; maxApprovalDiscount?: number } | null;
  financeOpsUser?: { id: string; employeeCode?: string } | null;
}

export interface InvitationData {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  token: string;
  department?: string | null;
  territory?: string | null;
  invitedBy?: { id?: string; name?: string; email?: string } | null;
  expiresAt: string;
  createdAt: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  currency: string;
  _count?: {
    users: number;
    quotations: number;
    products: number;
    warehouses: number;
  };
}

/**
 * Hook to fetch organization members roster
 */
export function useMembers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const res = await api.get<{ members?: MemberData[] } | MemberData[]>("/api/members");
      const list = (res as any)?.members ?? res;
      return Array.isArray(list) ? list : [];
    },
  });
}

/**
 * Hook to fetch team invitations
 */
export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await api.get<{ invitations?: InvitationData[] } | InvitationData[]>("/api/invitations");
      const list = (res as any)?.invitations ?? res;
      return Array.isArray(list) ? list : [];
    },
  });
}

/**
 * Hook to fetch active organization profile
 */
export function useCurrentOrg() {
  return useQuery({
    queryKey: queryKeys.organizations.current(),
    queryFn: async () => {
      const res = await api.get<{ organization?: OrganizationData } & OrganizationData>("/api/organizations/current");
      return res?.organization ?? res;
    },
  });
}

/**
 * Mutation: Send team member invitation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      email: string;
      role: string;
      department?: string;
      territory?: string;
      expiryDays?: number;
    }) => api.post<InvitationData>("/api/invitations", body),

    ...createOptimisticMutationOptions<
      { email: string; role: string; department?: string; territory?: string },
      InvitationData[]
    >({
      queryClient,
      queryKey: ["invitations"],
      updateFn: (oldList, variables) => {
        const optimisticInvite: InvitationData = {
          id: `temp-${Date.now()}`,
          email: variables.email,
          role: variables.role,
          status: "PENDING",
          token: `inv-${Date.now()}`,
          department: variables.department ?? null,
          territory: variables.territory ?? null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        return optimisticAppendItem(oldList, optimisticInvite, "start");
      },
    }),
  });
}

/**
 * Mutation: Revoke pending invitation
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/invitations/${id}`),

    ...createOptimisticMutationOptions<string, InvitationData[]>({
      queryClient,
      queryKey: ["invitations"],
      updateFn: (oldList, id) => optimisticRemoveItemFromList(oldList, id),
    }),
  });
}

/**
 * Mutation: Resend pending invitation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ message: string; invitation: InvitationData; inviteUrl: string }>(
        `/api/invitations/${id}/resend`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

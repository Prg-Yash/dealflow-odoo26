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
  slug?: string;
  currency: string;
  createdById?: string;
  createdAt?: string;
  userRole?: "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE_OPS" | "CUSTOMER";
  isCurrent?: boolean;
  isCreator?: boolean;
  _count?: {
    users?: number;
    members?: number;
    quotations?: number;
    products?: number;
    warehouses?: number;
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
 * Hook to fetch all organizations the authenticated user belongs to
 */
export function useUserOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const res = await api.get<{ organizations?: OrganizationData[] } | OrganizationData[]>("/api/organizations");
      const list = (res as any)?.organizations ?? res;
      return Array.isArray(list) ? list : [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
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
 * Mutation: Create a new Organization (creator becomes ADMIN)
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; slug?: string; currency?: string }) =>
      api.post<{ message: string; organization: OrganizationData; role: string }>("/api/organizations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

/**
 * Mutation: Switch active organization context
 */
export function useSwitchOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) =>
      api.post<{ success: boolean; message: string; organization: OrganizationData; role: string; user: any }>(
        `/api/organizations/${orgId}/switch`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

/**
 * Mutation: Update a member's role in the organization
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch<{ message: string; userId: string; role: string }>(`/api/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}

/**
 * Mutation: Remove a member from the organization
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<{ message: string; userId: string }>(`/api/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
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

export interface User2FAStatusData {
  totpEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhoneNumber: string | null;
  whatsappVerified: boolean;
  maskedPhone: string | null;
}

/**
 * Hook to fetch current user's 2FA status
 */
export function use2FAStatus() {
  return useQuery({
    queryKey: ["auth", "2fa-status"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: User2FAStatusData }>("/api/2fa/status");
      return res.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

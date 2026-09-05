"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";

export interface ShipmentLineData {
  id: string;
  quantity: number;
  productId: string;
  product?: { name: string; sku: string };
}

export interface ShipmentData {
  id: string;
  shipmentNumber: string;
  warehouseId: string;
  warehouse?: { id: string; name: string; code: string };
  carrier?: string | null;
  trackingNumber?: string | null;
  shippingCost: number;
  status: "PENDING" | "PICKED" | "PACKED" | "SHIPPED" | "DELIVERED";
  lines?: ShipmentLineData[];
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentOrderData {
  id: string;
  fulfillmentNumber: string;
  status: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";
  shippingAddress?: string | null;
  promisedDate?: string | null;
  quotationId: string;
  quotation?: {
    id: string;
    quoteNumber: string;
    title: string;
    customer?: { name: string };
  };
  shipments?: ShipmentData[];
  lines?: Array<{ id: string; quantity: number; pendingQuantity?: number; fulfilledQuantity?: number }>;
  backorders?: Array<{
    id: string;
    quantity: number;
    status: string;
    productId?: string;
    product?: { name: string; sku: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch fulfillment orders list
 */
export function useFulfillmentOrders(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.fulfillment.orders(filters),
    queryFn: () => api.get<FulfillmentOrderData[]>("/api/fulfillment-orders", { params: filters }),
  });
}

/**
 * Hook to fetch single fulfillment order
 */
export function useFulfillmentOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.fulfillment.orderDetail(id),
    queryFn: () => api.get<FulfillmentOrderData>(`/api/fulfillment-orders/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Hook to preview greedy multi-warehouse split
 */
export function usePreviewSplit(id: string) {
  return useQuery({
    queryKey: [...queryKeys.fulfillment.orderDetail(id), "split-preview"],
    queryFn: () => api.get<any>(`/api/fulfillment-orders/${id}/split-preview`),
    enabled: Boolean(id),
  });
}

/**
 * Mutation: Accept warehouse split and reserve stock
 */
export function useAcceptSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fulfillmentOrderId: string) =>
      api.post(`/api/fulfillment-orders/${fulfillmentOrderId}/accept-split`),
    onSuccess: (_data, fulfillmentOrderId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.orderDetail(fulfillmentOrderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Mutation: Update shipment status (PENDING -> PICKED -> PACKED -> SHIPPED -> DELIVERED)
 */
export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipmentId,
      status,
      carrier,
      trackingNumber,
    }: {
      shipmentId: string;
      status: ShipmentData["status"];
      carrier?: string;
      trackingNumber?: string;
    }) => api.patch<ShipmentData>(`/api/shipments/${shipmentId}/status`, { status, carrier, trackingNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

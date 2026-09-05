"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { queryKeys } from "../query-keys";

export interface WarehouseData {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
  address?: string | null;
  shippingCostWeight?: number;
  capacity?: number | null;
  isActive: boolean;
  stockLevels?: StockLevelData[];
  _count?: { stockLevels: number; shipments?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLevelData {
  id: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable?: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  reorderPoint: number;
  reorderQuantity?: number;
  isBelowReorderPoint?: boolean;
  warehouse?: WarehouseData;
  product?: { id: string; name: string; sku: string; basePrice: number; costPrice?: number; unit?: string; categoryId?: string };
  variant?: { id: string; name?: string; sku?: string; attributeName?: string; attributeValue?: string };
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Hook to fetch warehouses with defensive unwrapping
 */
export function useWarehouses(includeInactive = true) {
  return useQuery({
    queryKey: [...queryKeys.fulfillment.warehouses(), { includeInactive }],
    queryFn: async () => {
      const res = await api.get<{ warehouses?: WarehouseData[]; data?: WarehouseData[] } | WarehouseData[]>(
        "/api/warehouses",
        { params: includeInactive ? { includeInactive: "true" } : undefined }
      );
      const list = (res as any)?.warehouses ?? (res as any)?.data ?? res;
      return Array.isArray(list) ? list : [];
    },
  });
}

/**
 * Hook to fetch single warehouse
 */
export function useWarehouse(id: string) {
  return useQuery({
    queryKey: queryKeys.fulfillment.warehouseDetail(id),
    queryFn: async () => {
      const res = await api.get<{ warehouse?: WarehouseData; data?: WarehouseData } | WarehouseData>(
        `/api/warehouses/${id}`
      );
      return (res as any)?.warehouse ?? (res as any)?.data ?? res;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch stock levels across warehouses
 */
export function useStockLevels(filters?: {
  productId?: string;
  warehouseId?: string;
  variantId?: string;
  belowReorderPoint?: string;
}) {
  return useQuery({
    queryKey: queryKeys.products.stockLevels(filters),
    queryFn: async () => {
      const res = await api.get<{ stockLevels?: StockLevelData[]; data?: StockLevelData[] } | StockLevelData[]>(
        "/api/stock-levels",
        { params: filters }
      );
      const list = (res as any)?.stockLevels ?? (res as any)?.data ?? res;
      return (Array.isArray(list) ? list : []).map((s: any) => ({
        ...s,
        onHand: s.quantityOnHand ?? s.onHand ?? 0,
        reserved: s.quantityReserved ?? s.reserved ?? 0,
        available: s.quantityAvailable ?? s.available ?? (s.quantityOnHand ?? 0) - (s.quantityReserved ?? 0),
      }));
    },
  });
}

/**
 * Mutation: Create new warehouse
 */
export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      code?: string;
      location?: string;
      address?: string;
      shippingCostWeight?: number;
      capacity?: number;
      isActive?: boolean;
    }) => api.post<WarehouseData>("/api/warehouses", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.warehouses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Mutation: Update existing warehouse
 */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      code?: string;
      location?: string;
      address?: string;
      shippingCostWeight?: number;
      capacity?: number;
      isActive?: boolean;
    }) => api.patch<WarehouseData>(`/api/warehouses/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.warehouses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Mutation: Delete warehouse (deactivates / removes depot)
 */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.warehouses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Mutation: Adjust stock level directly (supports product and variant)
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      warehouseId: string;
      productId: string;
      variantId?: string;
      quantityDelta?: number;
      deltaOnHand?: number;
      deltaReserved?: number;
      movementType?: "ADJUSTMENT" | "PURCHASE_RECEIPT" | "TRANSFER" | "ORDER_FULFILLED" | "ORDER_RESERVED";
      notes?: string;
      referenceId?: string;
    }) => {
      const payload = {
        warehouseId: body.warehouseId,
        productId: body.productId,
        variantId: body.variantId,
        quantityDelta: body.quantityDelta ?? body.deltaOnHand ?? 0,
        movementType: body.movementType ?? "ADJUSTMENT",
        notes: body.notes,
        referenceId: body.referenceId,
      };
      return api.post<StockLevelData>("/api/stock-levels/adjust", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });
}

export interface StockMovementData {
  id: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  movementType: "PURCHASE_RECEIPT" | "ORDER_RESERVED" | "ORDER_FULFILLED" | "ADJUSTMENT" | "TRANSFER";
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
  warehouse?: { id: string; name: string; code?: string | null };
  product?: { id: string; name: string; sku: string; basePrice: number; costPrice: number };
}

/**
 * Hook to fetch stock movements audit history
 */
export function useStockMovements(filters?: { productId?: string; warehouseId?: string; limit?: number }) {
  return useQuery({
    queryKey: ["stockMovements", filters],
    queryFn: async () => {
      const res = await api.get<{ data?: StockMovementData[] } | StockMovementData[]>("/api/stock-levels/movements", {
        params: filters,
      });
      const list = (res as any)?.data ?? res;
      return Array.isArray(list) ? list : [];
    },
  });
}


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

export interface ProductVariantData {
  id: string;
  sku: string;
  name: string;
  priceDelta: number;
  attributes?: Record<string, any>;
  isActive: boolean;
}

export interface ProductData {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  basePrice: number;
  costPrice: number;
  unit: string;
  unitType?: string;
  isPromoted: boolean;
  isActive: boolean;
  stockOnHand?: number;
  stockReserved?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    type: "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
    color?: string | null;
  };
  variants?: ProductVariantData[];
  stockLevels?: Array<{
    id: string;
    warehouseId: string;
    onHand: number;
    reserved: number;
    warehouse?: { id: string; name: string; code: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  type: "HARDWARE" | "SERVICE" | "SUBSCRIPTION";
  description?: string | null;
  color?: string | null;
  _count?: { products: number };
}

/**
 * Hook to fetch product catalog list
 */
export function useProducts(filters?: { categoryId?: string; search?: string; isPromoted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => api.get<ProductData[]>("/api/products", { params: filters }),
  });
}

/**
 * Hook to fetch single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.get<ProductData>(`/api/products/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch categories
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: () => api.get<CategoryData[]>("/api/categories"),
  });
}

/**
 * Mutation: Create a new product in the catalog
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      sku: string;
      description?: string;
      basePrice: number;
      costPrice: number;
      unit?: string;
      categoryId: string;
      isPromoted?: boolean;
    }) => api.post<ProductData>("/api/products", body),

    ...createOptimisticMutationOptions<
      { name: string; sku: string; basePrice: number; costPrice: number; categoryId: string; description?: string; unit?: string; isPromoted?: boolean },
      ProductData[]
    >({
      queryClient,
      queryKey: queryKeys.products.lists(),
      updateFn: (oldList, variables) => {
        const optimisticProduct: ProductData = {
          id: `temp-${Date.now()}`,
          name: variables.name,
          sku: variables.sku,
          description: variables.description ?? null,
          basePrice: variables.basePrice,
          costPrice: variables.costPrice,
          unit: variables.unit ?? "UNIT",
          isPromoted: variables.isPromoted ?? false,
          isActive: true,
          categoryId: variables.categoryId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return optimisticAppendItem(oldList, optimisticProduct, "start");
      },
    }),
  });
}

/**
 * Mutation: Update product catalog entry
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProductData> }) =>
      api.patch<ProductData>(`/api/products/${id}`, body),

    ...createOptimisticMutationOptions<{ id: string; body: Partial<ProductData> }, ProductData[]>({
      queryClient,
      queryKey: queryKeys.products.lists(),
      updateFn: (oldList, { id, body }) => optimisticUpdateItemInList(oldList, id, body),
    }),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

/**
 * Mutation: Delete product from catalog
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),

    ...createOptimisticMutationOptions<string, ProductData[]>({
      queryClient,
      queryKey: queryKeys.products.lists(),
      updateFn: (oldList, id) => optimisticRemoveItemFromList(oldList, id),
    }),
  });
}

/**
 * Mutation: Create category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; slug?: string; type: CategoryData["type"]; description?: string; color?: string }) =>
      api.post<CategoryData>("/api/categories", body),
    onSuccess: (newCat) => {
      queryClient.setQueryData<CategoryData[]>(queryKeys.products.categories(), (old) =>
        old ? [...old, newCat] : [newCat]
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.products.categories() });
    },
  });
}

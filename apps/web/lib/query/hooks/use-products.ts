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
  name?: string;
  attributeName?: string;
  attributeValue?: string;
  priceDelta?: number;
  extraPrice?: number;
  attributes?: Record<string, any>;
  isActive?: boolean;
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
  discountCeiling?: number;
  targetMargin?: number;
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

/**
 * Mutation: Update category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CategoryData> & { discountCeiling?: number; targetMargin?: number } }) =>
      api.patch<CategoryData>(`/api/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.categories() });
    },
  });
}

/**
 * Mutation: Delete category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.categories() });
    },
  });
}

export interface PriceListData {
  id: string;
  name: string;
  currency: string;
  customerTiers?: Array<{ id: string; name: string; code: string; discountCeiling: number }>;
  customerTierId?: string | null;
  customerTier?: { id: string; name: string; code: string; discountCeiling: number };
  isDefault: boolean;
  items?: Array<{
    id: string;
    productId: string;
    variantId?: string | null;
    fixedPrice?: number | null;
    discountPercent?: number | null;
    product?: { id: string; name: string; sku: string; basePrice: number };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook to fetch all Price Lists
 */
export function usePriceLists() {
  return useQuery({
    queryKey: ["price-lists"],
    queryFn: () => api.get<PriceListData[]>("/api/price-lists"),
  });
}

/**
 * Mutation: Create a Price List
 */
export function useCreatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; currency: string; customerTierIds?: string[]; customerTierId?: string; isDefault?: boolean }) =>
      api.post<PriceListData>("/api/price-lists", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
    },
  });
}

/**
 * Mutation: Update a Price List
 */
export function useUpdatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<{ name: string; currency: string; customerTierIds: string[]; customerTierId: string | null; isDefault: boolean }> }) =>
      api.patch<PriceListData>(`/api/price-lists/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
    },
  });
}

/**
 * Mutation: Delete a Price List
 */
export function useDeletePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/price-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
    },
  });
}

export interface ProductRecommendationData {
  id: string;
  sourceProductId: string;
  recommendedProductId: string;
  coPurchaseScore: number;
  promotionalTag?: string | null;
  minMarginThreshold: number;
  isActive: boolean;
  sourceProduct?: { id: string; name: string; sku?: string; basePrice?: number; costPrice?: number };
  recommendedProduct?: { id: string; name: string; sku?: string; basePrice?: number; costPrice?: number };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook to fetch all Product Recommendations
 */
export function useProductRecommendations() {
  return useQuery({
    queryKey: ["product-recommendations"],
    queryFn: () => api.get<ProductRecommendationData[]>("/api/product-recommendations"),
  });
}

/**
 * Mutation: Create Product Recommendation pairing
 */
export function useCreateProductRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      sourceProductId: string;
      recommendedProductId: string;
      coPurchaseScore?: number;
      promotionalTag?: string;
      minMarginThreshold?: number;
      isActive?: boolean;
    }) => api.post<ProductRecommendationData>("/api/product-recommendations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recommendations"] });
    },
  });
}

/**
 * Mutation: Update Product Recommendation pairing
 */
export function useUpdateProductRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        sourceProductId: string;
        recommendedProductId: string;
        coPurchaseScore: number;
        promotionalTag: string | null;
        minMarginThreshold: number;
        isActive: boolean;
      }>;
    }) => api.patch<ProductRecommendationData>(`/api/product-recommendations/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recommendations"] });
    },
  });
}

/**
 * Mutation: Delete Product Recommendation pairing
 */
export function useDeleteProductRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/product-recommendations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recommendations"] });
    },
  });
}



/**
 * Mutation: Create Product Variant
 */
export function useCreateProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: { attributeName: string; attributeValue: string; extraPrice?: number; sku?: string } }) =>
      api.post<ProductVariantData>(`/api/products/${productId}/variants`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

/**
 * Mutation: Delete Product Variant
 */
export function useDeleteProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      api.delete(`/api/products/${productId}/variants/${variantId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}


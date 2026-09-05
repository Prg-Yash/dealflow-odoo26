import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as productService from "../services/product.service.js";

export const listProducts = asyncHandler(async (req: TenantRequest, res: Response) => {
  const { categoryId, isPromoted, search } = req.query;
  const products = await productService.listProducts(req.orgId, {
    categoryId: categoryId as string,
    isPromoted: isPromoted === undefined ? undefined : isPromoted === "true",
    search: search as string,
  });
  return res.json({ success: true, data: products });
});

export const getProduct = asyncHandler(async (req: TenantRequest, res: Response) => {
  const product = await productService.getProductById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: TenantRequest, res: Response) => {
  const product = await productService.createProduct(req.orgId, req.body);
  return res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: TenantRequest, res: Response) => {
  const product = await productService.updateProduct(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req: TenantRequest, res: Response) => {
  const result = await productService.deleteProduct(req.orgId, req.params.id as string);
  return res.json({ success: true, data: result });
});

// Variants
export const listVariants = asyncHandler(async (req: TenantRequest, res: Response) => {
  const variants = await productService.listVariants(req.orgId, req.params.id as string);
  return res.json({ success: true, data: variants });
});

export const createVariant = asyncHandler(async (req: TenantRequest, res: Response) => {
  const variant = await productService.createVariant(req.orgId, req.params.id as string, req.body);
  return res.status(201).json({ success: true, data: variant });
});

export const updateVariant = asyncHandler(async (req: TenantRequest, res: Response) => {
  const variant = await productService.updateVariant(
    req.orgId,
    req.params.id as string,
    req.params.variantId as string,
    req.body
  );
  return res.json({ success: true, data: variant });
});

export const deleteVariant = asyncHandler(async (req: TenantRequest, res: Response) => {
  await productService.deleteVariant(
    req.orgId,
    req.params.id as string,
    req.params.variantId as string
  );
  return res.json({ success: true, data: { message: "Product variant deleted successfully." } });
});

// Effective Price
export const getEffectivePrice = asyncHandler(async (req: TenantRequest, res: Response) => {
  const result = await productService.getEffectivePrice(
    req.orgId,
    req.params.id as string,
    req.query as any
  );
  return res.json({ success: true, data: result });
});

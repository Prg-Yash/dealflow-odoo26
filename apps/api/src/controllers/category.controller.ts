import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as categoryService from "../services/category.service.js";

export const listCategories = asyncHandler(async (req: TenantRequest, res: Response) => {
  const categories = await categoryService.listCategories(req.orgId);
  return res.json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req: TenantRequest, res: Response) => {
  const category = await categoryService.getCategoryById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req: TenantRequest, res: Response) => {
  const category = await categoryService.createCategory(req.orgId, req.body);
  return res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: TenantRequest, res: Response) => {
  const category = await categoryService.updateCategory(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: TenantRequest, res: Response) => {
  await categoryService.deleteCategory(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Category deleted successfully." } });
});

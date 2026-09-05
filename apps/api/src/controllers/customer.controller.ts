import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as customerService from "../services/customer.service.js";

export const listCustomers = asyncHandler(async (req: TenantRequest, res: Response) => {
  const customers = await customerService.listCustomers(req.orgId);
  return res.json({ success: true, data: customers });
});

export const getCustomer = asyncHandler(async (req: TenantRequest, res: Response) => {
  const customer = await customerService.getCustomerById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: customer });
});

export const createCustomer = asyncHandler(async (req: TenantRequest, res: Response) => {
  const customer = await customerService.createCustomer(req.orgId, req.body);
  return res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req: TenantRequest, res: Response) => {
  const customer = await customerService.updateCustomer(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: customer });
});

export const assignRep = asyncHandler(async (req: TenantRequest, res: Response) => {
  const customer = await customerService.assignRep(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req: TenantRequest, res: Response) => {
  const result = await customerService.deleteCustomer(req.orgId, req.params.id as string);
  return res.json({ success: true, data: result });
});

export const inviteCustomer = asyncHandler(async (req: TenantRequest, res: Response) => {
  const result = await customerService.inviteCustomer(
    req.orgId,
    req.user!,
    req.body
  );
  return res.status(201).json({
    success: true,
    message: `Invitation successfully dispatched to customer ${result.customer.email}`,
    data: result,
  });
});


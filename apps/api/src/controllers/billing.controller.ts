import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as billingService from "../services/billing.service.js";

// =============================================================================
// Quotation Confirmation (Hybrid Invoicing Trigger)
// =============================================================================

export const confirmQuotation = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.confirmQuotation(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Quotation confirmed successfully and billing entities created.",
      data: result,
    });
  }
);

// =============================================================================
// Subscriptions
// =============================================================================

export const getSubscription = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const subscription = await billingService.getSubscriptionById(
      req.orgId,
      req.params.id as string
    );
    return res.json({ success: true, data: subscription });
  }
);

export const listSubscriptions = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.listSubscriptions(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      data: result.subscriptions,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  }
);

export const updateSubscriptionLine = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.updateSubscriptionLineQuantity(
      req.orgId,
      req.params.id as string,
      req.params.lineId as string,
      req.body
    );
    return res.json({
      success: true,
      message:
        result.proratedDelta > 0
          ? "Seat count increased. Prorated adjustment invoice issued."
          : result.proratedDelta < 0
            ? "Seat count reduced. Credit note issued for unused fraction."
            : "No quantity change.",
      data: result,
    });
  }
);

export const createSubscription = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const subscription = await billingService.createSubscriptionPlan(
      req.orgId,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Subscription plan schedule created successfully.",
      data: subscription,
    });
  }
);

export const modifySubscription = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const updated = await billingService.modifySubscription(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.json({
      success: true,
      message: "Subscription updated successfully.",
      data: updated,
    });
  }
);

export const scheduleSubscriptionReminder = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.scheduleSubscriptionReminder(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);

export const cancelSubscription = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.cancelSubscription(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.json({
      success: true,
      message: "Subscription cancelled successfully.",
      data: result,
    });
  }
);

// =============================================================================
// Invoices & Settlements
// =============================================================================

export const listInvoices = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.listInvoices(
      req.orgId,
      req.query as any,
      req.user?.role,
      req.user?.customerProfile?.id
    );
    return res.json({
      success: true,
      data: result.invoices,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  }
);

export const getInvoice = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const invoice = await billingService.getInvoiceById(
      req.orgId,
      req.params.id as string,
      req.user?.role,
      req.user?.customerProfile?.id
    );
    return res.json({ success: true, data: invoice });
  }
);

export const recordPayment = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.recordPayment(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.status(201).json({
      success: true,
      message:
        result.invoice.status === "PAID"
          ? "Payment recorded. Invoice settled in full."
          : "Payment recorded successfully.",
      data: result,
    });
  }
);

// =============================================================================
// Credit Notes
// =============================================================================

export const listCreditNotes = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.listCreditNotes(
      req.orgId,
      req.query as any,
      req.user?.role,
      req.user?.customerProfile?.id
    );
    return res.json({
      success: true,
      data: result.creditNotes,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  }
);

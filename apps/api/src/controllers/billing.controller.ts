import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as billingService from "../services/billing.service.js";

// =============================================================================
// Phase 3: Hybrid Invoicing & Subscriptions (POST /api/billing/generate)
// =============================================================================

export const generateHybridBilling = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.generateHybridBilling(
      req.orgId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Hybrid billing and subscription entities generated successfully.",
      data: result,
    });
  }
);

export const generateShipmentInvoice = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const shipmentId = req.params.id || req.body.shipmentId;
    const result = await billingService.generateShipmentInvoice(
      req.orgId,
      shipmentId as string
    );
    return res.status(200).json({
      success: true,
      message: "Fulfillment shipment invoice generated successfully.",
      data: result,
    });
  }
);

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
    const subscriptions = await billingService.listSubscriptions(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      data: subscriptions,
    });
  }
);

export const updateSubscriptionLine = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await billingService.updateSubscriptionLine(
      req.orgId,
      req.params.id as string,
      req.params.lineId as string,
      req.body
    );
    return res.json({
      success: true,
      message: result.message,
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
    const invoices = await billingService.listInvoices(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      data: invoices,
    });
  }
);

export const getInvoice = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const invoice = await billingService.getInvoiceById(
      req.orgId,
      req.params.id as string
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
    const creditNotes = await billingService.listCreditNotes(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      data: creditNotes,
    });
  }
);

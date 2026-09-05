import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import { rankUpsellSuggestions, type UpsellCandidate } from "../lib/upsell-engine.js";
import type {
  CreatePriceListInput,
  UpdatePriceListInput,
  CreatePriceListItemInput,
  UpdatePriceListItemInput,
  CreateDiscountApprovalRuleInput,
  UpdateDiscountApprovalRuleInput,
  CreateProductRecommendationInput,
  UpdateProductRecommendationInput,
} from "../schemas/pricing.schema.js";

// =============================================================================
// Price Lists & Items
// =============================================================================

export async function listPriceLists(organizationId: string) {
  return prisma.priceList.findMany({
    where: { organizationId },
    include: {
      customerTier: { select: { id: true, name: true, code: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPriceListById(organizationId: string, id: string) {
  const priceList = await prisma.priceList.findFirst({
    where: { id, organizationId },
    include: {
      customerTier: true,
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, basePrice: true } },
          variant: true,
        },
      },
    },
  });
  if (!priceList) {
    throw new AppError(404, "NOT_FOUND", "Price list not found.");
  }
  return priceList;
}

export async function createPriceList(organizationId: string, input: CreatePriceListInput) {
  if (input.customerTierId) {
    const tier = await prisma.customerTier.findFirst({
      where: { id: input.customerTierId, organizationId },
    });
    if (!tier) throw new AppError(400, "INVALID_TIER", "Customer tier not found.");
  }

  if (input.isDefault) {
    await prisma.priceList.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.priceList.create({
    data: { ...input, organizationId },
    include: { customerTier: true },
  });
}

export async function updatePriceList(organizationId: string, id: string, input: UpdatePriceListInput) {
  await getPriceListById(organizationId, id);

  if (input.isDefault) {
    await prisma.priceList.updateMany({
      where: { organizationId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  return prisma.priceList.update({
    where: { id },
    data: input,
    include: { customerTier: true },
  });
}

export async function deletePriceList(organizationId: string, id: string) {
  await getPriceListById(organizationId, id);
  return prisma.priceList.delete({ where: { id } });
}

export async function addPriceListItem(
  organizationId: string,
  priceListId: string,
  input: CreatePriceListItemInput
) {
  await getPriceListById(organizationId, priceListId);

  const product = await prisma.product.findFirst({
    where: { id: input.productId, organizationId },
  });
  if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found in this organization.");

  return prisma.priceListItem.create({
    data: {
      priceListId,
      productId: input.productId,
      variantId: input.variantId || null,
      fixedPrice: input.fixedPrice,
      discountPercent: input.discountPercent,
      minQuantity: input.minQuantity || 1,
    },
    include: {
      product: { select: { id: true, name: true, sku: true, basePrice: true } },
    },
  });
}

export async function updatePriceListItem(
  organizationId: string,
  priceListId: string,
  itemId: string,
  input: UpdatePriceListItemInput
) {
  await getPriceListById(organizationId, priceListId);
  return prisma.priceListItem.update({
    where: { id: itemId },
    data: input,
  });
}

export async function deletePriceListItem(
  organizationId: string,
  priceListId: string,
  itemId: string
) {
  await getPriceListById(organizationId, priceListId);
  return prisma.priceListItem.delete({ where: { id: itemId } });
}

// =============================================================================
// Discount Approval Rules
// =============================================================================

export async function listDiscountRules(organizationId: string) {
  return prisma.discountApprovalRule.findMany({
    where: { organizationId },
    orderBy: { minDiscountPercent: "asc" },
  });
}

export async function createDiscountRule(
  organizationId: string,
  input: CreateDiscountApprovalRuleInput
) {
  return prisma.discountApprovalRule.create({
    data: { ...input, organizationId },
  });
}

export async function updateDiscountRule(
  organizationId: string,
  id: string,
  input: UpdateDiscountApprovalRuleInput
) {
  const rule = await prisma.discountApprovalRule.findFirst({
    where: { id, organizationId },
  });
  if (!rule) throw new AppError(404, "NOT_FOUND", "Discount approval rule not found.");

  return prisma.discountApprovalRule.update({
    where: { id },
    data: input,
  });
}

export async function deleteDiscountRule(organizationId: string, id: string) {
  const rule = await prisma.discountApprovalRule.findFirst({
    where: { id, organizationId },
  });
  if (!rule) throw new AppError(404, "NOT_FOUND", "Discount approval rule not found.");
  return prisma.discountApprovalRule.delete({ where: { id } });
}

// =============================================================================
// Product Recommendations & Upsell Engine Integration
// =============================================================================

export async function listRecommendations(organizationId: string) {
  return prisma.productRecommendation.findMany({
    where: { organizationId },
    include: {
      sourceProduct: { select: { id: true, name: true, sku: true } },
      recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true } },
    },
    orderBy: { coPurchaseScore: "desc" },
  });
}

export async function createRecommendation(
  organizationId: string,
  input: CreateProductRecommendationInput
) {
  const [source, target] = await Promise.all([
    prisma.product.findFirst({ where: { id: input.sourceProductId, organizationId } }),
    prisma.product.findFirst({ where: { id: input.recommendedProductId, organizationId } }),
  ]);
  if (!source || !target) {
    throw new AppError(400, "INVALID_PRODUCTS", "Source or recommended product not found in this organization.");
  }

  const existing = await prisma.productRecommendation.findUnique({
    where: {
      sourceProductId_recommendedProductId: {
        sourceProductId: input.sourceProductId,
        recommendedProductId: input.recommendedProductId,
      },
    },
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_RECOMMENDATION", "This product pairing recommendation already exists.");
  }

  return prisma.productRecommendation.create({
    data: { ...input, organizationId },
    include: {
      sourceProduct: { select: { id: true, name: true } },
      recommendedProduct: { select: { id: true, name: true } },
    },
  });
}

export async function updateRecommendation(
  organizationId: string,
  id: string,
  input: UpdateProductRecommendationInput
) {
  const rec = await prisma.productRecommendation.findFirst({
    where: { id, organizationId },
  });
  if (!rec) throw new AppError(404, "NOT_FOUND", "Recommendation not found.");

  return prisma.productRecommendation.update({
    where: { id },
    data: input,
  });
}

export async function deleteRecommendation(organizationId: string, id: string) {
  const rec = await prisma.productRecommendation.findFirst({
    where: { id, organizationId },
  });
  if (!rec) throw new AppError(404, "NOT_FOUND", "Recommendation not found.");
  return prisma.productRecommendation.delete({ where: { id } });
}

/**
 * Gathers candidates for a live quotation and invokes the pure upsell-engine
 */
export async function getQuotationUpsellSuggestions(
  organizationId: string,
  quotationId: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: { lines: { select: { productId: true } } },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  const existingProductIds = quotation.lines.map((l) => l.productId);

  // Recommendations triggered by current products in quote, excluding already added items
  const recommendations = await prisma.productRecommendation.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(existingProductIds.length > 0
        ? {
            sourceProductId: { in: existingProductIds },
            recommendedProductId: { notIn: existingProductIds },
          }
        : {}),
    },
    include: {
      recommendedProduct: true,
    },
  });

  // Map into plain data structure for the pure business engine
  const candidates: UpsellCandidate[] = recommendations.map((rec) => ({
    productId: rec.recommendedProduct.id,
    productName: rec.recommendedProduct.name,
    sku: rec.recommendedProduct.sku,
    basePrice: rec.recommendedProduct.basePrice,
    costPrice: rec.recommendedProduct.costPrice,
    coPurchaseScore: rec.coPurchaseScore,
    isPromoted: rec.recommendedProduct.isPromoted,
    promotionalTag: rec.promotionalTag,
    minMarginThreshold: rec.minMarginThreshold,
  }));

  // Pure function calculation: enforces hard margin threshold and ranks with promotion bonus
  return rankUpsellSuggestions(candidates);
}

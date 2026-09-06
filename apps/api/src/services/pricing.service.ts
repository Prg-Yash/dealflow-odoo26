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
  let lists = await prisma.priceList.findMany({
    where: { organizationId },
    include: {
      customerTiers: { select: { id: true, name: true, code: true, discountCeiling: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, basePrice: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (lists.length === 0) {
    const tiers = await prisma.customerTier.findMany({
      where: { organizationId },
      orderBy: { discountCeiling: "asc" },
    });

    const bronzeTier = tiers.find((t) => t.code === "BRONZE");
    const silverTier = tiers.find((t) => t.code === "SILVER");
    const goldTier = tiers.find((t) => t.code === "GOLD");
    const platinumTier = tiers.find((t) => t.code === "PLATINUM");

    const defaultPriceLists = [
      {
        name: "Standard Commercial 2026",
        currency: "INR",
        tierIds: [bronzeTier?.id, silverTier?.id].filter(Boolean) as string[],
        isDefault: true,
      },
      {
        name: "Enterprise Multi-Tier Volume Schedule",
        currency: "INR",
        tierIds: [silverTier?.id, goldTier?.id, platinumTier?.id].filter(Boolean) as string[],
        isDefault: false,
      },
      {
        name: "Strategic Key Accounts Master Agreement",
        currency: "INR",
        tierIds: [goldTier?.id, platinumTier?.id].filter(Boolean) as string[],
        isDefault: false,
      },
    ];

    for (const pl of defaultPriceLists) {
      await prisma.priceList.create({
        data: {
          organizationId,
          name: pl.name,
          currency: pl.currency,
          isDefault: pl.isDefault,
          ...(pl.tierIds.length > 0
            ? { customerTiers: { connect: pl.tierIds.map((id) => ({ id })) } }
            : {}),
        },
      });
    }

    lists = await prisma.priceList.findMany({
      where: { organizationId },
      include: {
        customerTiers: { select: { id: true, name: true, code: true, discountCeiling: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, basePrice: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return lists;
}

export async function getPriceListById(organizationId: string, id: string) {
  const priceList = await prisma.priceList.findFirst({
    where: { id, organizationId },
    include: {
      customerTiers: true,
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
  const rawTierIds = input.customerTierIds ?? (input.customerTierId ? [input.customerTierId] : []);
  const tierIds = Array.isArray(rawTierIds) ? rawTierIds.filter(Boolean) : [];

  if (tierIds.length > 0) {
    const foundTiers = await prisma.customerTier.findMany({
      where: { id: { in: tierIds }, organizationId },
    });
    if (foundTiers.length !== tierIds.length) {
      throw new AppError(400, "INVALID_TIER", "One or more customer tiers not found.");
    }
  }

  if (input.isDefault) {
    await prisma.priceList.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.priceList.create({
    data: {
      name: input.name,
      currency: input.currency || "INR",
      isDefault: input.isDefault || false,
      organizationId,
      ...(tierIds.length > 0
        ? { customerTiers: { connect: tierIds.map((tid) => ({ id: tid })) } }
        : {}),
    },
    include: {
      customerTiers: { select: { id: true, name: true, code: true, discountCeiling: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, basePrice: true } } } },
      _count: { select: { items: true } },
    },
  });
}

export async function updatePriceList(organizationId: string, id: string, input: UpdatePriceListInput) {
  await getPriceListById(organizationId, id);

  const rawTierIds = input.customerTierIds ?? (input.customerTierId ? [input.customerTierId] : undefined);
  let tierIds: string[] | undefined = undefined;
  if (rawTierIds !== undefined) {
    tierIds = Array.isArray(rawTierIds) ? rawTierIds.filter(Boolean) : [];
    if (tierIds.length > 0) {
      const foundTiers = await prisma.customerTier.findMany({
        where: { id: { in: tierIds }, organizationId },
      });
      if (foundTiers.length !== tierIds.length) {
        throw new AppError(400, "INVALID_TIER", "One or more customer tiers not found.");
      }
    }
  }

  if (input.isDefault) {
    await prisma.priceList.updateMany({
      where: { organizationId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  return prisma.priceList.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(tierIds !== undefined
        ? { customerTiers: { set: tierIds.map((tid) => ({ id: tid })) } }
        : {}),
    },
    include: {
      customerTiers: { select: { id: true, name: true, code: true, discountCeiling: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, basePrice: true } } } },
      _count: { select: { items: true } },
    },
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
  let recs = await prisma.productRecommendation.findMany({
    where: { organizationId },
    include: {
      sourceProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
      recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
    },
    orderBy: { coPurchaseScore: "desc" },
  });

  if (recs.length === 0) {
    const products = await prisma.product.findMany({ where: { organizationId } });
    const laptop = products.find((p) => p.sku === "HW-LP-14" || p.name.includes("Laptop"));
    const mouse = products.find((p) => p.sku === "ACC-MSE-01" || p.name.includes("Mouse"));
    const dock = products.find((p) => p.sku === "ACC-DCK-01" || p.name.includes("Docking"));
    const care = products.find((p) => p.sku === "SUB-CARE-2Y" || p.name.includes("Care"));
    const onsite = products.find((p) => p.sku === "SRV-ONST-01" || p.name.includes("Onsite") || p.name.includes("Deploy"));
    const warranty = products.find((p) => p.sku === "SRV-WRNT-01" || p.name.includes("Warranty"));
    const server = products.find((p) => p.sku.startsWith("HW-SRV") || p.name.includes("Server"));
    const sla = products.find((p) => p.sku.startsWith("SRV-SLA") || p.name.includes("SLA"));

    const defaultPairs = [
      { src: laptop, tgt: mouse, score: 4.8, minMargin: 15, tag: null },
      { src: laptop, tgt: dock, score: 4.9, minMargin: 15, tag: "Promo: 12% off" },
      { src: laptop, tgt: care, score: 5.0, minMargin: 20, tag: null },
      { src: laptop, tgt: onsite, score: 4.5, minMargin: 20, tag: "Popular Pairing" },
      { src: laptop, tgt: warranty, score: 4.6, minMargin: 15, tag: "Extended Care" },
      { src: server, tgt: sla, score: 5.0, minMargin: 25, tag: "Enterprise SLA" },
      { src: server, tgt: onsite, score: 4.8, minMargin: 20, tag: "Fast Delivery" },
    ].filter((p) => p.src && p.tgt);

    for (const dp of defaultPairs) {
      if (dp.src && dp.tgt) {
        await prisma.productRecommendation.upsert({
          where: {
            id: `rec-${dp.src.id}-${dp.tgt.id}`.slice(0, 36),
          },
          update: {
            coPurchaseScore: dp.score,
            promotionalTag: dp.tag,
            minMarginThreshold: dp.minMargin,
            isActive: true,
          },
          create: {
            organizationId,
            sourceProductId: dp.src.id,
            recommendedProductId: dp.tgt.id,
            coPurchaseScore: dp.score,
            promotionalTag: dp.tag,
            minMarginThreshold: dp.minMargin,
            isActive: true,
          },
        });
      }
    }

    recs = await prisma.productRecommendation.findMany({
      where: { organizationId },
      include: {
        sourceProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
        recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
      },
      orderBy: { coPurchaseScore: "desc" },
    });
  }

  return recs;
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

  const existing = await prisma.productRecommendation.findFirst({
    where: {
      sourceProductId: input.sourceProductId,
      recommendedProductId: input.recommendedProductId,
    },
  });
  if (existing) {
    return prisma.productRecommendation.update({
      where: { id: existing.id },
      data: {
        coPurchaseScore: input.coPurchaseScore ?? existing.coPurchaseScore,
        promotionalTag: input.promotionalTag !== undefined ? input.promotionalTag : existing.promotionalTag,
        minMarginThreshold: input.minMarginThreshold ?? existing.minMarginThreshold,
        isActive: input.isActive ?? existing.isActive,
      },
      include: {
        sourceProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
        recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
      },
    });
  }

  return prisma.productRecommendation.create({
    data: {
      sourceProductId: input.sourceProductId,
      recommendedProductId: input.recommendedProductId,
      coPurchaseScore: input.coPurchaseScore ?? 1.0,
      promotionalTag: input.promotionalTag || undefined,
      minMarginThreshold: input.minMarginThreshold ?? 20.0,
      isActive: input.isActive ?? true,
      organizationId,
    },
    include: {
      sourceProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
      recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
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
    data: {
      ...(input.sourceProductId ? { sourceProductId: input.sourceProductId } : {}),
      ...(input.recommendedProductId ? { recommendedProductId: input.recommendedProductId } : {}),
      ...(input.coPurchaseScore !== undefined ? { coPurchaseScore: input.coPurchaseScore } : {}),
      ...(input.promotionalTag !== undefined ? { promotionalTag: input.promotionalTag } : {}),
      ...(input.minMarginThreshold !== undefined ? { minMarginThreshold: input.minMarginThreshold } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      sourceProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
      recommendedProduct: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
    },
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

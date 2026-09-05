import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type { CreateCustomerTierInput, UpdateCustomerTierInput } from "../schemas/customer-tier.schema.js";

export async function listTiers(organizationId: string) {
  let tiers = await prisma.customerTier.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { customers: true },
      },
    },
    orderBy: { discountCeiling: "asc" },
  });

  if (tiers.length === 0) {
    const tierConfigs = [
      { code: "BRONZE", name: "Bronze Tier", discountCeiling: 5.0, description: "Standard commercial accounts. Up to 5% discount." },
      { code: "SILVER", name: "Silver Tier", discountCeiling: 10.0, description: "Established mid-market clients. Up to 10% discount." },
      { code: "GOLD", name: "Gold Tier", discountCeiling: 15.0, description: "Strategic high-volume enterprise partners. Up to 15% discount." },
      { code: "PLATINUM", name: "Platinum Tier", discountCeiling: 20.0, description: "Global key accounts and multi-national enterprise agreements. Up to 20% discount." },
    ];
    for (const t of tierConfigs) {
      await prisma.customerTier.upsert({
        where: { organizationId_code: { organizationId, code: t.code } },
        update: {},
        create: { organizationId, ...t },
      });
    }
    tiers = await prisma.customerTier.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { customers: true },
        },
      },
      orderBy: { discountCeiling: "asc" },
    });
  }

  return tiers;
}

export async function getTierById(organizationId: string, id: string) {
  const tier = await prisma.customerTier.findFirst({
    where: { id, organizationId },
    include: {
      _count: {
        select: { customers: true },
      },
    },
  });

  if (!tier) {
    throw new AppError(404, "NOT_FOUND", "Customer tier not found.");
  }

  return tier;
}

export async function createTier(organizationId: string, input: CreateCustomerTierInput) {
  const existing = await prisma.customerTier.findUnique({
    where: {
      organizationId_code: {
        organizationId,
        code: input.code,
      },
    },
  });

  if (existing) {
    throw new AppError(409, "DUPLICATE_CODE", `Customer tier with code '${input.code}' already exists.`);
  }

  return prisma.customerTier.create({
    data: {
      ...input,
      organizationId,
    },
  });
}

export async function updateTier(organizationId: string, id: string, input: UpdateCustomerTierInput) {
  await getTierById(organizationId, id);

  if (input.code) {
    const existing = await prisma.customerTier.findFirst({
      where: {
        organizationId,
        code: input.code,
        NOT: { id },
      },
    });
    if (existing) {
      throw new AppError(409, "DUPLICATE_CODE", `Customer tier with code '${input.code}' already exists.`);
    }
  }

  return prisma.customerTier.update({
    where: { id },
    data: input,
  });
}

export async function deleteTier(organizationId: string, id: string) {
  const tier = await getTierById(organizationId, id);

  const customerCount = await prisma.customer.count({
    where: { tierId: id, organizationId },
  });

  if (customerCount > 0) {
    throw new AppError(
      400,
      "TIER_IN_USE",
      `Cannot delete tier '${tier.name}' because ${customerCount} customer(s) are assigned to it.`
    );
  }

  return prisma.customerTier.delete({
    where: { id },
  });
}

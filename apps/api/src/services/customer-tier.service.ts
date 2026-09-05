import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type { CreateCustomerTierInput, UpdateCustomerTierInput } from "../schemas/customer-tier.schema.js";

export async function listTiers(organizationId: string) {
  return prisma.customerTier.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { customers: true },
      },
    },
    orderBy: { discountCeiling: "asc" },
  });
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

import { prisma } from "@repo/db";

interface CreateOrgParams {
  name: string;
  slug?: string;
  currency?: string;
  createdById: string;
}

export async function createOrganization({
  name,
  slug,
  currency = "USD",
  createdById,
}: CreateOrgParams) {
  const generatedSlug =
    slug?.trim().toLowerCase() ||
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36)}`;

  const organization = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug: generatedSlug,
      currency: currency.toUpperCase(),
      createdById,
      users: {
        connect: { id: createdById },
      },
    },
    include: {
      warehouses: true,
      _count: {
        select: {
          users: true,
          warehouses: true,
          salesReps: true,
          salesManagers: true,
          financeOpsUsers: true,
        },
      },
    },
  });

  return organization;
}

export async function getOrganizationById(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      warehouses: {
        where: { isActive: true },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          users: true,
          warehouses: true,
          salesReps: true,
          salesManagers: true,
          financeOpsUsers: true,
        },
      },
    },
  });
}

export async function updateOrganization(
  id: string,
  data: { name?: string; currency?: string; slug?: string }
) {
  return prisma.organization.update({
    where: { id },
    data,
  });
}

export async function listUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      OR: [
        { createdById: userId },
        { users: { some: { id: userId } } },
      ],
    },
    include: {
      _count: {
        select: {
          users: true,
          warehouses: true,
        },
      },
    },
  });
}

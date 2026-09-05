import { prisma } from "@repo/db";

interface CreateWarehouseParams {
  name: string;
  code?: string;
  location?: string;
  shippingCostWeight?: number;
  organizationId: string;
  createdById?: string;
}

export async function createWarehouse({
  name,
  code,
  location,
  shippingCostWeight = 1.0,
  organizationId,
  createdById,
}: CreateWarehouseParams) {
  return prisma.warehouse.create({
    data: {
      name: name.trim(),
      code: code?.trim() || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
      location: location?.trim(),
      shippingCostWeight: Number(shippingCostWeight) || 1.0,
      organizationId,
      createdById,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function listWarehouses(organizationId: string, includeInactive = false) {
  return prisma.warehouse.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getWarehouseById(id: string, organizationId: string) {
  return prisma.warehouse.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateWarehouse(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    code?: string;
    location?: string;
    shippingCostWeight?: number;
    isActive?: boolean;
  }
) {
  return prisma.warehouse.updateMany({
    where: {
      id,
      organizationId,
    },
    data,
  });
}

export async function deleteWarehouse(id: string, organizationId: string) {
  return prisma.warehouse.updateMany({
    where: {
      id,
      organizationId,
    },
    data: {
      isActive: false,
    },
  });
}

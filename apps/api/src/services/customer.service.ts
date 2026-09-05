import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  AssignRepInput,
} from "../schemas/customer.schema.js";

export async function listCustomers(organizationId: string) {
  return prisma.customer.findMany({
    where: { organizationId },
    include: {
      tier: { select: { id: true, name: true, code: true, discountCeiling: true } },
      salesRep: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: { quotations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerById(organizationId: string, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      tier: true,
      salesRep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          manager: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      portalUser: { select: { id: true, name: true, email: true } },
      _count: {
        select: { quotations: true, subscriptions: true, invoices: true },
      },
    },
  });

  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer not found.");
  }

  return customer;
}

export async function createCustomer(organizationId: string, input: CreateCustomerInput) {
  // Validate customer tier within same tenant
  const tier = await prisma.customerTier.findFirst({
    where: { id: input.tierId, organizationId },
  });
  if (!tier) {
    throw new AppError(400, "INVALID_TIER", "Selected customer tier does not exist in this organization.");
  }

  // Validate sales rep within same tenant if supplied
  if (input.salesRepId) {
    const rep = await prisma.salesRepresentative.findFirst({
      where: { id: input.salesRepId, organizationId },
    });
    if (!rep) {
      throw new AppError(400, "INVALID_SALES_REP", "Sales representative not found in this organization.");
    }
  }

  // Validate portal user within same tenant if supplied
  if (input.portalUserId) {
    const portalUser = await prisma.user.findFirst({
      where: { id: input.portalUserId, organizationId },
    });
    if (!portalUser) {
      throw new AppError(400, "INVALID_PORTAL_USER", "Portal user not found in this organization.");
    }
  }

  return prisma.customer.create({
    data: {
      ...input,
      organizationId,
    },
    include: {
      tier: true,
      salesRep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function updateCustomer(
  organizationId: string,
  id: string,
  input: UpdateCustomerInput
) {
  await getCustomerById(organizationId, id);

  if (input.tierId) {
    const tier = await prisma.customerTier.findFirst({
      where: { id: input.tierId, organizationId },
    });
    if (!tier) {
      throw new AppError(400, "INVALID_TIER", "Selected customer tier does not exist in this organization.");
    }
  }

  if (input.salesRepId) {
    const rep = await prisma.salesRepresentative.findFirst({
      where: { id: input.salesRepId, organizationId },
    });
    if (!rep) {
      throw new AppError(400, "INVALID_SALES_REP", "Sales representative not found in this organization.");
    }
  }

  return prisma.customer.update({
    where: { id },
    data: input,
    include: {
      tier: true,
      salesRep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function assignRep(organizationId: string, id: string, input: AssignRepInput) {
  await getCustomerById(organizationId, id);

  const rep = await prisma.salesRepresentative.findFirst({
    where: { id: input.salesRepId, organizationId },
  });
  if (!rep) {
    throw new AppError(400, "INVALID_SALES_REP", "Sales representative not found in this organization.");
  }

  return prisma.customer.update({
    where: { id },
    data: { salesRepId: input.salesRepId },
    include: {
      tier: true,
      salesRep: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function deleteCustomer(organizationId: string, id: string) {
  const customer = await getCustomerById(organizationId, id);

  // Check if any quotation references this customer
  const quotationCount = await prisma.quotation.count({
    where: { customerId: id, organizationId },
  });

  if (quotationCount > 0) {
    // Soft-deactivate to maintain foreign key integrity for audit and quotation history
    const deactivated = await prisma.customer.update({
      where: { id },
      data: {
        name: customer.name.startsWith("[INACTIVE]") ? customer.name : `[INACTIVE] ${customer.name}`,
        company: customer.company ? (customer.company.startsWith("[INACTIVE]") ? customer.company : `[INACTIVE] ${customer.company}`) : "[INACTIVE]",
      },
    });

    return {
      softDeactivated: true,
      message: `Customer is referenced by ${quotationCount} quotation(s) and has been soft-deactivated.`,
      customer: deactivated,
    };
  }

  // Hard delete if no quotation history exists
  await prisma.customer.delete({
    where: { id },
  });

  return {
    softDeactivated: false,
    message: "Customer deleted successfully.",
  };
}

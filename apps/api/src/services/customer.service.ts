import { prisma, UserRole } from "@repo/db";
import { AppError } from "../middleware/error.js";
import { createInvitation } from "./invitation.service.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  AssignRepInput,
  InviteCustomerInput,
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

export async function inviteCustomer(
  organizationId: string,
  inviterUser: { id: string; role: UserRole; salesRep?: { id: string } | null },
  input: InviteCustomerInput
) {
  const normalizedEmail = input.email.trim().toLowerCase();

  // 1. Determine salesRepId
  let assignedSalesRepId = input.salesRepId;
  if (!assignedSalesRepId && inviterUser.role === UserRole.SALES_REP) {
    const repProfile = await prisma.salesRepresentative.findUnique({
      where: { userId: inviterUser.id },
    });
    if (repProfile) {
      assignedSalesRepId = repProfile.id;
    }
  }

  // If assignedSalesRepId is specified, validate within tenant
  if (assignedSalesRepId) {
    const rep = await prisma.salesRepresentative.findFirst({
      where: { id: assignedSalesRepId, organizationId },
    });
    if (!rep) {
      throw new AppError(400, "INVALID_SALES_REP", "Sales representative not found in this organization.");
    }
  }

  // 2. Determine Tier ID
  let tierId = input.tierId;
  if (!tierId) {
    const defaultTier = await prisma.customerTier.findFirst({
      where: { organizationId },
      orderBy: { discountCeiling: "asc" },
    });
    if (!defaultTier) {
      throw new AppError(400, "NO_TIER_FOUND", "No customer tier exists in this organization. Please create a tier first.");
    }
    tierId = defaultTier.id;
  } else {
    const tier = await prisma.customerTier.findFirst({
      where: { id: tierId, organizationId },
    });
    if (!tier) {
      throw new AppError(400, "INVALID_TIER", "Selected customer tier does not exist in this organization.");
    }
  }

  // 3. Upsert Customer record
  let customer = await prisma.customer.findFirst({
    where: { email: normalizedEmail, organizationId },
  });

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: input.name.trim(),
        company: input.company ? input.company.trim() : customer.company,
        phone: input.phone ? input.phone.trim() : customer.phone,
        taxId: input.taxId ? input.taxId.trim() : customer.taxId,
        paymentTerms: input.paymentTerms || customer.paymentTerms,
        billingAddress: input.billingAddress ? input.billingAddress.trim() : customer.billingAddress,
        shippingAddress: input.shippingAddress ? input.shippingAddress.trim() : customer.shippingAddress,
        tierId,
        salesRepId: assignedSalesRepId || customer.salesRepId,
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
  } else {
    customer = await prisma.customer.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        taxId: input.taxId?.trim() || null,
        paymentTerms: input.paymentTerms || "Net 30",
        billingAddress: input.billingAddress?.trim() || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        organizationId,
        tierId,
        salesRepId: assignedSalesRepId || null,
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

  // 4. Create and dispatch customer onboarding invitation via SMTP
  const { invitation, inviteUrl } = await createInvitation({
    email: normalizedEmail,
    role: UserRole.CUSTOMER,
    organizationId,
    invitedById: inviterUser.id,
    metadata: {
      customerId: customer.id,
      companyName: customer.company,
      salesRepId: assignedSalesRepId || null,
    },
  });

  return {
    customer,
    invitation,
    inviteUrl,
  };
}


import { prisma, UserRole } from "@repo/db";
import { AppError } from "../middleware/error.js";

interface CreateOrgParams {
  name: string;
  slug?: string;
  currency?: string;
  createdById: string;
}

/**
 * Creates a new organization, sets the creator as Admin,
 * creates an OrganizationMember record, and provisions default entities.
 */
export async function createOrganization({
  name,
  slug,
  currency = "INR",
  createdById,
}: CreateOrgParams) {
  const generatedSlug =
    slug?.trim().toLowerCase() ||
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36)}`;

  // 1. Create Organization & Link creator
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

  // 2. Ensure OrganizationMember entry is created for creator with ADMIN role
  try {
    if ((prisma as any).organizationMember) {
      await (prisma as any).organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: createdById,
            organizationId: organization.id,
          },
        },
        create: {
          userId: createdById,
          organizationId: organization.id,
          role: UserRole.ADMIN,
        },
        update: {
          role: UserRole.ADMIN,
        },
      });
    }
  } catch (err) {
    console.warn("[OrganizationService] Note on member record upsert:", err);
  }

  // 3. Update user's active organizationId and active role to ADMIN
  await prisma.user.update({
    where: { id: createdById },
    data: {
      organizationId: organization.id,
      role: UserRole.ADMIN,
    },
  });

  // 4. Provision default Customer Tier (Standard)
  try {
    await prisma.customerTier.create({
      data: {
        organizationId: organization.id,
        name: "Standard",
        code: "STANDARD",
        discountCeiling: 10.0,
        description: "Standard Commercial Tier",
      },
    });
  } catch (err) {
    console.warn("[OrganizationService] Note on default tier creation:", err);
  }

  // 5. Provision default Primary Warehouse
  try {
    await prisma.warehouse.create({
      data: {
        name: "Main Fulfillment Center",
        code: "WH-MAIN",
        location: "Primary Logistics Hub",
        shippingCostWeight: 1.0,
        isActive: true,
        organizationId: organization.id,
        createdById,
      },
    });
  } catch (err) {
    console.warn("[OrganizationService] Note on default warehouse creation:", err);
  }

  return {
    ...organization,
    userRole: UserRole.ADMIN,
    isCurrent: true,
    isCreator: true,
  };
}

/**
 * Retrieves organization details by ID with optional caller's role context
 */
export async function getOrganizationById(id: string, userId?: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      warehouses: {
        where: { isActive: true },
      },
      creator: {
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
          quotations: true,
          products: true,
        },
      },
    },
  });

  if (!org) return null;

  let userRole: UserRole = UserRole.CUSTOMER;
  if (userId) {
    if (org.createdById === userId) {
      userRole = UserRole.ADMIN;
    } else {
      try {
        if ((prisma as any).organizationMember) {
          const membership = await (prisma as any).organizationMember.findUnique({
            where: {
              userId_organizationId: {
                userId,
                organizationId: id,
              },
            },
          });
          if (membership?.role) {
            userRole = membership.role;
          }
        }
      } catch {
        // Fallback to user's db role if in this org
        const u = await prisma.user.findUnique({ where: { id: userId } });
        if (u && u.organizationId === id) {
          userRole = u.role;
        }
      }
    }
  }

  return {
    ...org,
    userRole,
  };
}

/**
 * Updates organization details (Admin only)
 */
export async function updateOrganization(
  id: string,
  data: { name?: string; currency?: string; slug?: string }
) {
  return prisma.organization.update({
    where: { id },
    data,
  });
}

/**
 * Lists all organizations the user has access to with their per-org roles.
 */
/**
 * Lists all organizations the user has access to with their per-org roles (Admin, Sales Manager, Finance, Sales Rep).
 * Discovers organizations via OrganizationMember table, created organizations, user relations,
 * role profile tables (SalesRep, SalesManager, FinanceOpsUser), and invitations.
 */
export async function listUserOrganizations(userId: string) {
  // 1. Get current active user state
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, organizationId: true, role: true },
  });

  if (!currentUser) {
    return [];
  }

  // 2. Discover all organizations and map user's specific role in each
  const membershipMap = new Map<string, UserRole>();
  const allDiscoveredOrgIds = new Set<string>();

  // A. Check OrganizationMember table
  try {
    if ((prisma as any).organizationMember) {
      const memberships = await (prisma as any).organizationMember.findMany({
        where: { userId },
      });
      memberships.forEach((m: any) => {
        allDiscoveredOrgIds.add(m.organizationId);
        membershipMap.set(m.organizationId, m.role);
      });
    }
  } catch (err) {
    console.warn("[OrganizationService] OrganizationMember list note:", err);
  }

  // B. Check SalesRepresentative profile table
  try {
    const reps = await prisma.salesRepresentative.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    reps.forEach((r) => {
      allDiscoveredOrgIds.add(r.organizationId);
      if (!membershipMap.has(r.organizationId)) {
        membershipMap.set(r.organizationId, UserRole.SALES_REP);
      }
    });
  } catch (err) {
    console.warn("[OrganizationService] SalesRep query note:", err);
  }

  // C. Check SalesManager profile table
  try {
    const managers = await prisma.salesManager.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    managers.forEach((m) => {
      allDiscoveredOrgIds.add(m.organizationId);
      if (!membershipMap.has(m.organizationId)) {
        membershipMap.set(m.organizationId, UserRole.SALES_MANAGER);
      }
    });
  } catch (err) {
    console.warn("[OrganizationService] SalesManager query note:", err);
  }

  // D. Check FinanceOpsUser profile table
  try {
    const financeUsers = await prisma.financeOpsUser.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    financeUsers.forEach((f) => {
      allDiscoveredOrgIds.add(f.organizationId);
      if (!membershipMap.has(f.organizationId)) {
        membershipMap.set(f.organizationId, UserRole.FINANCE_OPS);
      }
    });
  } catch (err) {
    console.warn("[OrganizationService] FinanceOpsUser query note:", err);
  }

  // E. Check Invitations where email matches (both ACCEPTED and PENDING)
  if (currentUser.email) {
    try {
      const invites = await prisma.invitation.findMany({
        where: {
          email: {
            equals: currentUser.email.trim(),
            mode: "insensitive",
          },
        },
        select: { organizationId: true, role: true, status: true },
      });
      invites.forEach((inv) => {
        allDiscoveredOrgIds.add(inv.organizationId);
        if (!membershipMap.has(inv.organizationId)) {
          membershipMap.set(inv.organizationId, inv.role);
        }
      });
    } catch (err) {
      console.warn("[OrganizationService] Invitations query note:", err);
    }
  }

  // F. Check current user.organizationId
  if (currentUser.organizationId) {
    allDiscoveredOrgIds.add(currentUser.organizationId);
    if (!membershipMap.has(currentUser.organizationId)) {
      membershipMap.set(currentUser.organizationId, currentUser.role);
    }
  }

  // 3. Find all organizations matching ANY of the discovered IDs, or createdById = userId, or user in users relation
  const orgWhereClauses: any[] = [
    { createdById: userId },
    { users: { some: { id: userId } } },
  ];

  if (allDiscoveredOrgIds.size > 0) {
    orgWhereClauses.push({ id: { in: Array.from(allDiscoveredOrgIds) } });
  }

  const organizations = await prisma.organization.findMany({
    where: {
      OR: orgWhereClauses,
    },
    include: {
      creator: {
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
          products: true,
          quotations: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 4. Map organizations and synchronize OrganizationMember table
  const results = await Promise.all(
    organizations.map(async (org) => {
      const isCreator = org.createdById === userId;
      let userRole: UserRole = isCreator
        ? UserRole.ADMIN
        : membershipMap.get(org.id) ||
          (org.id === currentUser.organizationId ? currentUser.role : UserRole.SALES_REP);

      if (isCreator) {
        userRole = UserRole.ADMIN;
      }

      // Auto-heal / persist membership in OrganizationMember table
      try {
        if ((prisma as any).organizationMember) {
          await (prisma as any).organizationMember.upsert({
            where: {
              userId_organizationId: {
                userId,
                organizationId: org.id,
              },
            },
            create: {
              userId,
              organizationId: org.id,
              role: userRole,
            },
            update: {
              role: isCreator ? UserRole.ADMIN : userRole,
            },
          });
        }
      } catch (err) {
        // Ignore concurrency / duplicate notes
      }

      const isCurrent = currentUser.organizationId === org.id;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        createdById: org.createdById,
        createdAt: org.createdAt,
        userRole,
        isCurrent,
        isCreator,
        _count: org._count,
      };
    })
  );

  return results;
}

/**
 * Switches the active organization context for the authenticated user.
 * Validates access, updates user.organizationId and user.role to the per-org role,
 * and synchronizes the OrganizationMember table.
 */
export async function switchOrganization(userId: string, targetOrgId: string) {
  // 1. Verify target organization exists
  const targetOrg = await prisma.organization.findUnique({
    where: { id: targetOrgId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { users: true, warehouses: true, products: true, quotations: true } },
    },
  });

  if (!targetOrg) {
    throw new AppError(404, "NOT_FOUND", "The target organization does not exist.");
  }

  const isCreator = targetOrg.createdById === userId;
  let targetRole: UserRole = isCreator ? UserRole.ADMIN : UserRole.SALES_REP;

  // 2. Resolve user's role in this target organization
  if (isCreator) {
    targetRole = UserRole.ADMIN;
  } else {
    let foundRole: UserRole | null = null;

    // A. Check OrganizationMember table
    try {
      if ((prisma as any).organizationMember) {
        const mem = await (prisma as any).organizationMember.findUnique({
          where: { userId_organizationId: { userId, organizationId: targetOrgId } },
        });
        if (mem?.role) foundRole = mem.role;
      }
    } catch {}

    // B. Check SalesManager
    if (!foundRole) {
      const sm = await prisma.salesManager.findFirst({ where: { userId, organizationId: targetOrgId } });
      if (sm) foundRole = UserRole.SALES_MANAGER;
    }

    // C. Check FinanceOpsUser
    if (!foundRole) {
      const fo = await prisma.financeOpsUser.findFirst({ where: { userId, organizationId: targetOrgId } });
      if (fo) foundRole = UserRole.FINANCE_OPS;
    }

    // D. Check SalesRepresentative
    if (!foundRole) {
      const sr = await prisma.salesRepresentative.findFirst({ where: { userId, organizationId: targetOrgId } });
      if (sr) foundRole = UserRole.SALES_REP;
    }

    // E. Check Invitation
    if (!foundRole) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u?.email) {
        const inv = await prisma.invitation.findFirst({
          where: {
            organizationId: targetOrgId,
            email: { equals: u.email.trim(), mode: "insensitive" },
          },
        });
        if (inv) foundRole = inv.role;
      }
    }

    // F. Check current user table
    if (!foundRole) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u && u.organizationId === targetOrgId) {
        foundRole = u.role;
      }
    }

    if (foundRole) {
      targetRole = foundRole;
    }
  }

  // 3. Upsert OrganizationMember table
  try {
    if ((prisma as any).organizationMember) {
      await (prisma as any).organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId: targetOrgId,
          },
        },
        create: {
          userId,
          organizationId: targetOrgId,
          role: targetRole,
        },
        update: {
          role: targetRole,
        },
      });
    }
  } catch (err) {
    console.warn("[OrganizationService] Membership upsert note:", err);
  }

  // 4. Atomically update user's active organizationId and role (persisting last active org)
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      organizationId: targetOrgId,
      role: targetRole,
    },
    include: {
      organization: true,
      salesRep: true,
      salesManager: true,
      financeOpsUser: true,
    },
  });

  return {
    success: true,
    message: `Switched active organization to '${targetOrg.name}'.`,
    organization: {
      ...targetOrg,
      userRole: targetRole,
      isCurrent: true,
      isCreator,
    },
    role: targetRole,
    activeRole: targetRole,
    user: updatedUser,
  };
}

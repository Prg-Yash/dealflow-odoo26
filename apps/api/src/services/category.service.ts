import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas/category.schema.js";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function listCategories(organizationId: string) {
  let categories = await prisma.category.findMany({
    where: { organizationId },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    await prisma.category.createMany({
      data: [
        {
          name: "Physical Hardware",
          slug: `physical-hardware-${Date.now().toString(36)}`,
          type: "HARDWARE",
          discountCeiling: 15.0,
          targetMargin: 35.0,
          description: "Physical devices, servers, appliances, and warehouse equipment",
          organizationId,
        },
        {
          name: "SaaS Subscriptions",
          slug: `saas-subscriptions-${Date.now().toString(36)}`,
          type: "SUBSCRIPTION",
          discountCeiling: 12.0,
          targetMargin: 85.0,
          description: "Cloud software licenses, recurring seats, and digital platforms",
          organizationId,
        },
        {
          name: "Professional Services",
          slug: `professional-services-${Date.now().toString(36)}`,
          type: "SERVICE",
          discountCeiling: 10.0,
          targetMargin: 60.0,
          description: "Consulting, engineering hours, and deployment packages",
          organizationId,
        },
      ],
      skipDuplicates: true,
    });

    categories = await prisma.category.findMany({
      where: { organizationId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  return categories;
}

export async function getCategoryById(organizationId: string, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, organizationId },
    include: {
      products: { select: { id: true, name: true, sku: true, basePrice: true } },
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    throw new AppError(404, "NOT_FOUND", "Category not found.");
  }

  return category;
}

export async function createCategory(organizationId: string, input: CreateCategoryInput) {
  const slug = input.slug?.trim() || generateSlug(input.name);

  const existing = await prisma.category.findUnique({
    where: { organizationId_slug: { organizationId, slug } },
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_SLUG", `Category with slug '${slug}' already exists.`);
  }

  return prisma.category.create({
    data: {
      ...input,
      slug,
      organizationId,
    },
  });
}

export async function updateCategory(organizationId: string, id: string, input: UpdateCategoryInput) {
  await getCategoryById(organizationId, id);

  if (input.slug) {
    const existing = await prisma.category.findFirst({
      where: { organizationId, slug: input.slug, NOT: { id } },
    });
    if (existing) {
      throw new AppError(409, "DUPLICATE_SLUG", `Category with slug '${input.slug}' already exists.`);
    }
  }

  return prisma.category.update({
    where: { id },
    data: input,
  });
}

export async function deleteCategory(organizationId: string, id: string) {
  const category = await getCategoryById(organizationId, id);

  const productCount = await prisma.product.count({
    where: { categoryId: id, organizationId },
  });
  if (productCount > 0) {
    throw new AppError(
      400,
      "CATEGORY_IN_USE",
      `Cannot delete category '${category.name}' because ${productCount} product(s) are assigned to it.`
    );
  }

  return prisma.category.delete({
    where: { id },
  });
}

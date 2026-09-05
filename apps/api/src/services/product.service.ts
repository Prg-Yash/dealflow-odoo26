import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  EffectivePriceQuery,
} from "../schemas/product.schema.js";

export async function listProducts(
  organizationId: string,
  filter?: { categoryId?: string; isPromoted?: boolean; search?: string }
) {
  return prisma.product.findMany({
    where: {
      organizationId,
      ...(filter?.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter?.isPromoted !== undefined ? { isPromoted: filter.isPromoted } : {}),
      ...(filter?.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { sku: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true, slug: true, discountCeiling: true } },
      variants: { where: { isActive: true } },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(organizationId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, organizationId },
    include: {
      category: true,
      variants: true,
    },
  });

  if (!product) {
    throw new AppError(404, "NOT_FOUND", "Product not found.");
  }

  return product;
}

export async function createProduct(organizationId: string, input: CreateProductInput) {
  // Validate category in tenant
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, organizationId },
  });
  if (!category) {
    throw new AppError(400, "INVALID_CATEGORY", "Category does not exist in this organization.");
  }

  const existingSku = await prisma.product.findFirst({
    where: { organizationId, sku: input.sku },
  });
  if (existingSku) {
    throw new AppError(409, "DUPLICATE_SKU", `Product with SKU '${input.sku}' already exists in this organization.`);
  }

  return prisma.product.create({
    data: {
      ...input,
      organizationId,
    },
    include: { category: true },
  });
}

export async function updateProduct(organizationId: string, id: string, input: UpdateProductInput) {
  await getProductById(organizationId, id);

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, organizationId },
    });
    if (!category) {
      throw new AppError(400, "INVALID_CATEGORY", "Category does not exist in this organization.");
    }
  }

  if (input.sku) {
    const existingSku = await prisma.product.findFirst({
      where: { organizationId, sku: input.sku, NOT: { id } },
    });
    if (existingSku) {
      throw new AppError(409, "DUPLICATE_SKU", `Product with SKU '${input.sku}' already exists in this organization.`);
    }
  }

  return prisma.product.update({
    where: { id },
    data: input,
    include: { category: true, variants: true },
  });
}

export async function deleteProduct(organizationId: string, id: string) {
  await getProductById(organizationId, id);

  const quotationLineCount = await prisma.quotationLine.count({
    where: { productId: id },
  });
  if (quotationLineCount > 0) {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  return prisma.product.delete({
    where: { id },
  });
}

// Product Variants
export async function listVariants(organizationId: string, productId: string) {
  await getProductById(organizationId, productId);
  return prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createVariant(
  organizationId: string,
  productId: string,
  input: CreateProductVariantInput
) {
  await getProductById(organizationId, productId);
  return prisma.productVariant.create({
    data: {
      ...input,
      productId,
    },
  });
}

export async function updateVariant(
  organizationId: string,
  productId: string,
  variantId: string,
  input: UpdateProductVariantInput
) {
  await getProductById(organizationId, productId);
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) {
    throw new AppError(404, "NOT_FOUND", "Product variant not found.");
  }

  return prisma.productVariant.update({
    where: { id: variantId },
    data: input,
  });
}

export async function deleteVariant(organizationId: string, productId: string, variantId: string) {
  await getProductById(organizationId, productId);
  return prisma.productVariant.delete({
    where: { id: variantId },
  });
}

// Effective Price Resolution Order:
// 1. matching PriceListItem (by product + variant + minQuantity)
// 2. else PriceList marked isDefault
// 3. else Product.basePrice (+ variant extraPrice)
export async function getEffectivePrice(
  organizationId: string,
  productId: string,
  query: EffectivePriceQuery
) {
  const product = await getProductById(organizationId, productId);
  const quantity = query.quantity || 1;

  let unitBasePrice = product.basePrice;
  let variantName: string | undefined;

  if (query.variantId) {
    const variant = product.variants.find((v) => v.id === query.variantId);
    if (variant) {
      unitBasePrice += variant.extraPrice;
      variantName = `${variant.attributeName}: ${variant.attributeValue}`;
    }
  }

  // 1. Check matching PriceListItem for customer's tier
  if (query.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: query.customerId, organizationId },
      select: { tierId: true },
    });

    if (customer?.tierId) {
      const tierPriceList = await prisma.priceList.findFirst({
        where: { customerTierId: customer.tierId, organizationId },
        include: {
          items: {
            where: {
              productId,
              minQuantity: { lte: quantity },
              ...(query.variantId ? { variantId: query.variantId } : { variantId: null }),
            },
            orderBy: { minQuantity: "desc" },
          },
        },
      });

      const matchedItem = tierPriceList?.items[0];
      if (matchedItem) {
        const resolvedPrice =
          matchedItem.fixedPrice !== null && matchedItem.fixedPrice !== undefined
            ? matchedItem.fixedPrice
            : unitBasePrice * (1 - (matchedItem.discountPercent || 0) / 100);

        return {
          productId: product.id,
          productName: product.name,
          variantId: query.variantId,
          variantName,
          quantity,
          basePrice: unitBasePrice,
          effectivePrice: Math.round(resolvedPrice * 100) / 100,
          source: "PRICE_LIST_TIER",
          priceListId: tierPriceList.id,
          priceListName: tierPriceList.name,
        };
      }
    }
  }

  // 2. Check organization's default PriceList
  const defaultPriceList = await prisma.priceList.findFirst({
    where: { organizationId, isDefault: true },
    include: {
      items: {
        where: {
          productId,
          minQuantity: { lte: quantity },
          ...(query.variantId ? { variantId: query.variantId } : { variantId: null }),
        },
        orderBy: { minQuantity: "desc" },
      },
    },
  });

  const defaultMatchedItem = defaultPriceList?.items[0];
  if (defaultMatchedItem) {
    const resolvedPrice =
      defaultMatchedItem.fixedPrice !== null && defaultMatchedItem.fixedPrice !== undefined
        ? defaultMatchedItem.fixedPrice
        : unitBasePrice * (1 - (defaultMatchedItem.discountPercent || 0) / 100);

    return {
      productId: product.id,
      productName: product.name,
      variantId: query.variantId,
      variantName,
      quantity,
      basePrice: unitBasePrice,
      effectivePrice: Math.round(resolvedPrice * 100) / 100,
      source: "PRICE_LIST_DEFAULT",
      priceListId: defaultPriceList.id,
      priceListName: defaultPriceList.name,
    };
  }

  // 3. Fallback to basePrice
  return {
    productId: product.id,
    productName: product.name,
    variantId: query.variantId,
    variantName,
    quantity,
    basePrice: unitBasePrice,
    effectivePrice: Math.round(unitBasePrice * 100) / 100,
    source: "BASE_PRICE",
  };
}

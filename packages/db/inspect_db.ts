import { prisma } from "./src/index.js";

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log("Organizations:", orgs.map(o => ({ id: o.id, name: o.name })));

  const tiers = await prisma.customerTier.findMany();
  console.log("Customer Tiers count:", tiers.length, tiers.map(t => ({ id: t.id, name: t.name, code: t.code, ceiling: t.discountCeiling })));

  const priceLists = await prisma.priceList.findMany({ include: { customerTier: true, items: true } });
  console.log("Price Lists count:", priceLists.length, priceLists.map(pl => ({ id: pl.id, name: pl.name, currency: pl.currency, tier: pl.customerTier?.name })));

  const products = await prisma.product.findMany({ include: { category: true, variants: true } });
  console.log("Products count:", products.length, products.map(p => ({ id: p.id, name: p.name, sku: p.sku, category: p.category?.name, variants: p.variants.length })));

  const categories = await prisma.category.findMany();
  console.log("Categories count:", categories.length, categories.map(c => ({ id: c.id, name: c.name, type: c.type, ceiling: c.discountCeiling })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

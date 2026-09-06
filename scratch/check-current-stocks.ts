import { PrismaClient } from "@repo/db";

const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.stockLevel.findMany({
    include: {
      product: true,
      warehouse: true,
    },
  });

  console.log("Current DB Stock Levels:", stocks.map(s => ({
    productName: s.product.name,
    sku: s.product.sku,
    warehouseName: s.warehouse.name,
    warehouseId: s.warehouse.id,
    onHand: s.quantityOnHand,
    reserved: s.quantityReserved,
    available: s.quantityOnHand - s.quantityReserved,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

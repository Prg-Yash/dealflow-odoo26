import { prisma } from "@repo/db";

async function run() {
  console.log("Checking database tables...");

  // 1. Ensure column variantId exists safely on stock_levels table
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "stock_levels" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
    `);
    console.log("✓ Verified stock_levels.variantId column exists.");
  } catch (err) {
    console.log("Note on variantId column:", err);
  }

  // 2. Fetch organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found in DB!");
    return;
  }
  console.log("Found organization:", org.name, org.id);

  // 3. Fetch or ensure Warehouses exist
  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId: org.id },
  });
  console.log(`Found ${warehouses.length} warehouses for org:`, warehouses.map(w => w.name));

  let mainWh = warehouses.find(w => w.name.includes("Main") || w.code === "WH-MAIN");
  if (!mainWh) {
    mainWh = await prisma.warehouse.create({
      data: {
        name: "Main Central Warehouse",
        code: "WH-MAIN",
        location: "Denver, CO",
        shippingCostWeight: 1.0,
        organizationId: org.id,
      },
    });
    console.log("Created Main Warehouse:", mainWh.id);
  }

  let eastWh = warehouses.find(w => w.name.includes("East") || w.code === "WH-EAST");
  if (!eastWh) {
    eastWh = await prisma.warehouse.create({
      data: {
        name: "East Coast Logistics Depot",
        code: "WH-EAST",
        location: "Newark, NJ",
        shippingCostWeight: 1.3,
        organizationId: org.id,
      },
    });
    console.log("Created East Depot:", eastWh.id);
  }

  let westWh = warehouses.find(w => w.name.includes("West") || w.code === "WH-WEST");
  if (!westWh) {
    westWh = await prisma.warehouse.create({
      data: {
        name: "West Fast-Hub",
        code: "WH-WEST",
        location: "San Jose, CA",
        shippingCostWeight: 1.4,
        organizationId: org.id,
      },
    });
    console.log("Created West Fast-Hub:", westWh.id);
  }

  // 4. Fetch Products
  const products = await prisma.product.findMany({
    where: { organizationId: org.id },
  });
  console.log(`Found ${products.length} products for org:`, products.map(p => ({ id: p.id, name: p.name, sku: p.sku })));

  if (products.length === 0) {
    console.log("Creating hardware products...");
    let cat = await prisma.category.findFirst({ where: { organizationId: org.id } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: "Hardware & Devices",
          type: "HARDWARE" as any,
          organizationId: org.id,
        },
      });
    }

    const p1 = await prisma.product.create({
      data: {
        name: "Enterprise Server Blade X1",
        sku: "HW-SRV-01",
        categoryId: cat.id,
        basePrice: 4500.0,
        costPrice: 2400.0,
        organizationId: org.id,
      },
    });
    products.push(p1);

    const p2 = await prisma.product.create({
      data: {
        name: "Edge Network Gateway 48P",
        sku: "HW-NET-01",
        categoryId: cat.id,
        basePrice: 1200.0,
        costPrice: 650.0,
        organizationId: org.id,
      },
    });
    products.push(p2);

    const p3 = await prisma.product.create({
      data: {
        name: "Smart Terminal Controller",
        sku: "HW-TERM-01",
        categoryId: cat.id,
        basePrice: 600.0,
        costPrice: 310.0,
        organizationId: org.id,
      },
    });
    products.push(p3);
  }

  // 5. Seed stock levels across Main, East, and West warehouses
  const targetStock = [
    { warehouseId: mainWh.id, productId: products[0]!.id, onHand: 45, reserved: 8 },
    { warehouseId: mainWh.id, productId: products[1] ? products[1].id : products[0]!.id, onHand: 60, reserved: 12 },
    { warehouseId: mainWh.id, productId: products[2] ? products[2].id : products[0]!.id, onHand: 85, reserved: 5 },
    { warehouseId: eastWh.id, productId: products[0]!.id, onHand: 15, reserved: 2 },
    { warehouseId: eastWh.id, productId: products[1] ? products[1].id : products[0]!.id, onHand: 25, reserved: 4 },
    { warehouseId: westWh.id, productId: products[0]!.id, onHand: 20, reserved: 3 },
    { warehouseId: westWh.id, productId: products[2] ? products[2].id : products[0]!.id, onHand: 35, reserved: 0 },
  ];

  for (const st of targetStock) {
    const existing = await prisma.stockLevel.findFirst({
      where: {
        warehouseId: st.warehouseId,
        productId: st.productId,
      },
    });

    if (existing) {
      await prisma.stockLevel.update({
        where: { id: existing.id },
        data: {
          quantityOnHand: st.onHand,
          quantityReserved: st.reserved,
          reorderPoint: 10,
        },
      });
    } else {
      await prisma.stockLevel.create({
        data: {
          warehouseId: st.warehouseId,
          productId: st.productId,
          quantityOnHand: st.onHand,
          quantityReserved: st.reserved,
          reorderPoint: 10,
        },
      });
    }
  }

  // Check final count
  const allStock = await prisma.stockLevel.findMany({
    include: { warehouse: true, product: true },
  });

  console.log(`\n🎉 Successfully verified and populated ${allStock.length} live database stock levels:`);
  allStock.forEach(s => {
    console.log(`  • [${s.warehouse.name}] ${s.product.name} (${s.product.sku}) -> In Stock: ${s.quantityOnHand}, Reserved: ${s.quantityReserved}, Available: ${s.quantityOnHand - s.quantityReserved}`);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

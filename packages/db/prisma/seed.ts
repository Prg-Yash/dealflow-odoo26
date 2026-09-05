import dotenv from "dotenv";
import {
  PrismaClient,
  UserRole,
  CategoryType,
  UnitType,
  QuoteStage,
  ApprovalStatus,
  ApprovalLevel,
  StockMovementType,
} from "@prisma/client";

// Load environment variables from packages/db/.env
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("  🌱 DealFlow 360 - Seeding Master Demo Data");
  console.log("==================================================");

  // 1. Password Hasher
  let hashedPassword = "";
  try {
    const { hashPassword } = await import("better-auth/crypto");
    hashedPassword = await hashPassword("Password123!");
    console.log("✓ Generated Better Auth compatible password hash for 'Password123!'");
  } catch {
    const crypto = await import("crypto");
    hashedPassword = crypto.createHash("sha256").update("Password123!").digest("hex");
    console.log("✓ Generated SHA-256 fallback hash for 'Password123!'");
  }

  // 2. Organization
  console.log("\n[1/8] Creating Organization...");
  const org = await prisma.organization.upsert({
    where: { slug: "apex-tech" },
    update: {
      name: "Apex Enterprise Technologies Inc",
      currency: "USD",
    },
    create: {
      id: "org-apex-01",
      name: "Apex Enterprise Technologies Inc",
      slug: "apex-tech",
      currency: "USD",
    },
  });
  console.log(`✓ Organization ready: ${org.name} (${org.id})`);

  // 3. Customer Tiers
  console.log("\n[2/8] Creating Customer Tiers...");
  const tierConfigs = [
    {
      code: "BRONZE",
      name: "Bronze Tier",
      discountCeiling: 5.0,
      description: "Standard commercial accounts and new onboarding customers. Up to 5% discount.",
    },
    {
      code: "SILVER",
      name: "Silver Tier",
      discountCeiling: 10.0,
      description: "Established mid-market clients with recurring volume. Up to 10% discount.",
    },
    {
      code: "GOLD",
      name: "Gold Tier",
      discountCeiling: 15.0,
      description: "Strategic high-volume enterprise partners. Up to 15% discount.",
    },
    {
      code: "PLATINUM",
      name: "Platinum Tier",
      discountCeiling: 20.0,
      description: "Global key accounts and multi-national enterprise agreements. Up to 20% discount.",
    },
  ];

  const tiers: Record<string, any> = {};
  for (const tier of tierConfigs) {
    tiers[tier.code] = await prisma.customerTier.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: tier.code,
        },
      },
      update: {
        name: tier.name,
        discountCeiling: tier.discountCeiling,
        description: tier.description,
      },
      create: {
        organizationId: org.id,
        code: tier.code,
        name: tier.name,
        discountCeiling: tier.discountCeiling,
        description: tier.description,
      },
    });
    console.log(`  ✓ Tier: ${tier.name} (Cap: ${tier.discountCeiling}%)`);
  }

  // 4. Users with Diverse Roles
  console.log("\n[3/8] Seeding Users with Hashed Credentials (Password: Password123!)...");
  const seedUsers = [
    {
      id: "usr-admin-01",
      name: "System Administrator",
      email: "admin@dealflow360.com",
      role: UserRole.ADMIN,
    },
    {
      id: "usr-mgr-01",
      name: "Elena Rostova",
      email: "manager.elena@dealflow360.com",
      role: UserRole.SALES_MANAGER,
    },
    {
      id: "usr-rep-01",
      name: "Alex Rivera",
      email: "rep.alex@dealflow360.com",
      role: UserRole.SALES_REP,
    },
    {
      id: "usr-rep-02",
      name: "Sarah Chen",
      email: "rep.sarah@dealflow360.com",
      role: UserRole.SALES_REP,
    },
    {
      id: "usr-fin-01",
      name: "Marcus Vance",
      email: "finance.marcus@dealflow360.com",
      role: UserRole.FINANCE_OPS,
    },
    {
      id: "usr-cust-01",
      name: "Johnathan Ward",
      email: "buyer@acmecorp.com",
      role: UserRole.CUSTOMER,
    },
    {
      id: "usr-cust-02",
      name: "Elena Gomez",
      email: "procurement@betaindustries.com",
      role: UserRole.CUSTOMER,
    },
  ];

  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        organizationId: org.id,
        emailVerified: true,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationId: org.id,
        emailVerified: true,
      },
    });

    await prisma.account.upsert({
      where: { id: `acc-${u.id}` },
      update: {
        password: hashedPassword,
        userId: user.id,
      },
      create: {
        id: `acc-${u.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    console.log(`  ✓ User: ${user.name} <${user.email}> [${user.role}]`);
  }

  // 5. Staff Role Profiles & Hierarchy
  console.log("\n[4/8] Configuring Staff Profiles & Hierarchy...");
  const salesManager = await prisma.salesManager.upsert({
    where: { userId: "usr-mgr-01" },
    update: {
      organizationId: org.id,
      department: "Enterprise Solutions",
      approvalThreshold: 15.0,
    },
    create: {
      id: "sm-01",
      userId: "usr-mgr-01",
      organizationId: org.id,
      department: "Enterprise Solutions",
      approvalThreshold: 15.0,
    },
  });

  const salesRepAlex = await prisma.salesRepresentative.upsert({
    where: { userId: "usr-rep-01" },
    update: {
      organizationId: org.id,
      managerId: salesManager.id,
      commissionRate: 8.5,
      targetQuota: 250000,
      historicalAvgDiscount: 6.5,
    },
    create: {
      id: "sr-alex",
      userId: "usr-rep-01",
      organizationId: org.id,
      managerId: salesManager.id,
      commissionRate: 8.5,
      targetQuota: 250000,
      historicalAvgDiscount: 6.5,
    },
  });

  const salesRepSarah = await prisma.salesRepresentative.upsert({
    where: { userId: "usr-rep-02" },
    update: {
      organizationId: org.id,
      managerId: salesManager.id,
      commissionRate: 9.0,
      targetQuota: 300000,
      historicalAvgDiscount: 8.0,
    },
    create: {
      id: "sr-sarah",
      userId: "usr-rep-02",
      organizationId: org.id,
      managerId: salesManager.id,
      commissionRate: 9.0,
      targetQuota: 300000,
      historicalAvgDiscount: 8.0,
    },
  });

  await prisma.financeOpsUser.upsert({
    where: { userId: "usr-fin-01" },
    update: {
      organizationId: org.id,
      department: "Global Revenue Operations",
      canApproveHighRisk: true,
      canManageFulfillment: true,
      canManageBilling: true,
    },
    create: {
      id: "fin-01",
      userId: "usr-fin-01",
      organizationId: org.id,
      department: "Global Revenue Operations",
      canApproveHighRisk: true,
      canManageFulfillment: true,
      canManageBilling: true,
    },
  });
  console.log("  ✓ Sales Manager, Reps (Alex & Sarah), and Finance/Ops profiles established.");

  // 6. Customers & Assignee Links
  console.log("\n[5/8] Creating Customer Companies & Assigning Reps...");
  const customerConfigs = [
    {
      id: "cust-acme-01",
      name: "Acme Corporation",
      email: "buyer@acmecorp.com",
      company: "Acme Corp Global Logistics",
      phone: "+1 (555) 234-5678",
      taxId: "US-EIN-9923841",
      paymentTerms: "Net 30",
      tierId: tiers.GOLD.id,
      salesRepId: salesRepAlex.id,
      portalUserId: "usr-cust-01",
      billingAddress: "100 Enterprise Blvd, Suite 400, Chicago, IL 60601",
      shippingAddress: "100 Enterprise Blvd, Dock B, Chicago, IL 60601",
    },
    {
      id: "cust-beta-02",
      name: "Beta Industries",
      email: "procurement@betaindustries.com",
      company: "Beta Industries Manufacturing LLC",
      phone: "+1 (555) 876-5432",
      taxId: "US-EIN-4419283",
      paymentTerms: "Net 30",
      tierId: tiers.SILVER.id,
      salesRepId: salesRepSarah.id,
      portalUserId: "usr-cust-02",
      billingAddress: "450 Innovation Parkway, Austin, TX 78701",
      shippingAddress: "450 Innovation Parkway, Receiving Dock, Austin, TX 78701",
    },
    {
      id: "cust-omni-03",
      name: "OmniCorp Dynamics",
      email: "orders@omnicorpdynamics.com",
      company: "OmniCorp Dynamics Financial",
      phone: "+1 (555) 345-9876",
      taxId: "US-EIN-1122334",
      paymentTerms: "Due on Receipt",
      tierId: tiers.BRONZE.id,
      salesRepId: salesRepAlex.id,
      billingAddress: "78 Wall Street, 22nd Floor, New York, NY 10005",
      shippingAddress: "78 Wall Street, New York, NY 10005",
    },
    {
      id: "cust-quantum-04",
      name: "QuantumLeap Labs",
      email: "finance@quantumleaplabs.ai",
      company: "QuantumLeap AI Research Inc",
      phone: "+1 (555) 901-2345",
      taxId: "US-EIN-8877665",
      paymentTerms: "Net 60",
      tierId: tiers.PLATINUM.id,
      salesRepId: salesRepSarah.id,
      billingAddress: "1200 Silicon Way, Palo Alto, CA 94301",
      shippingAddress: "1200 Silicon Way, Tech Dock 4, Palo Alto, CA 94301",
    },
  ];

  const customers: Record<string, any> = {};
  for (const c of customerConfigs) {
    customers[c.id] = await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        taxId: c.taxId,
        paymentTerms: c.paymentTerms,
        tierId: c.tierId,
        salesRepId: c.salesRepId,
        organizationId: org.id,
        portalUserId: c.portalUserId ?? null,
        billingAddress: c.billingAddress,
        shippingAddress: c.shippingAddress,
      },
      create: {
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        taxId: c.taxId,
        paymentTerms: c.paymentTerms,
        tierId: c.tierId,
        salesRepId: c.salesRepId,
        organizationId: org.id,
        portalUserId: c.portalUserId ?? null,
        billingAddress: c.billingAddress,
        shippingAddress: c.shippingAddress,
      },
    });
    console.log(`  ✓ Customer: ${customers[c.id].name}`);
  }

  // 7. Warehouses & Live Stock Inventory
  console.log("\n[6/8] Seeding Warehouses & Stock Inventory...");
  const warehouseConfigs = [
    {
      id: "wh-denver-01",
      name: "Main Central Warehouse",
      code: "WH-MAIN",
      location: "Denver, Colorado",
      shippingCostWeight: 1.0,
    },
    {
      id: "wh-newark-02",
      name: "East Coast Logistics Depot",
      code: "WH-EAST",
      location: "Newark, New Jersey",
      shippingCostWeight: 1.3,
    },
    {
      id: "wh-sanjose-03",
      name: "West Fast-Hub",
      code: "WH-WEST",
      location: "San Jose, California",
      shippingCostWeight: 1.4,
    },
  ];

  const warehouses: Record<string, any> = {};
  for (const wh of warehouseConfigs) {
    warehouses[wh.id] = await prisma.warehouse.upsert({
      where: { id: wh.id },
      update: {
        name: wh.name,
        code: wh.code,
        location: wh.location,
        shippingCostWeight: wh.shippingCostWeight,
        organizationId: org.id,
        isActive: true,
      },
      create: {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        location: wh.location,
        shippingCostWeight: wh.shippingCostWeight,
        organizationId: org.id,
        isActive: true,
      },
    });
    console.log(`  ✓ Warehouse: ${wh.name} [${wh.code}] (Cost Weight: ${wh.shippingCostWeight})`);
  }

  // Categories & Products
  const catHardware = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "hardware" } },
    update: {
      name: "Hardware & Edge Appliances",
      type: CategoryType.HARDWARE,
      discountCeiling: 15.0,
      targetMargin: 35.0,
      description: "Physical servers, switches, industrial edge terminals, and infrastructure equipment",
    },
    create: {
      name: "Hardware & Edge Appliances",
      slug: "hardware",
      type: CategoryType.HARDWARE,
      discountCeiling: 15.0,
      targetMargin: 35.0,
      description: "Physical servers, switches, industrial edge terminals, and infrastructure equipment",
      organizationId: org.id,
    },
  });

  const catServices = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "services" } },
    update: {
      name: "Professional Services & SLAs",
      type: CategoryType.SERVICE,
      discountCeiling: 10.0,
      targetMargin: 60.0,
      description: "Deployment, cloud migration, integrations, and 24/7 technical support SLAs",
    },
    create: {
      name: "Professional Services & SLAs",
      slug: "services",
      type: CategoryType.SERVICE,
      discountCeiling: 10.0,
      targetMargin: 60.0,
      description: "Deployment, cloud migration, integrations, and 24/7 technical support SLAs",
      organizationId: org.id,
    },
  });

  const catSubscriptions = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "subscriptions" } },
    update: {
      name: "Cloud Subscriptions & Add-ons",
      type: CategoryType.SUBSCRIPTION,
      discountCeiling: 12.0,
      targetMargin: 85.0,
      description: "SaaS licenses, AI deal governance engine, and executive analytics suites",
    },
    create: {
      name: "Cloud Subscriptions & Add-ons",
      slug: "subscriptions",
      type: CategoryType.SUBSCRIPTION,
      discountCeiling: 12.0,
      targetMargin: 85.0,
      description: "SaaS licenses, AI deal governance engine, and executive analytics suites",
      organizationId: org.id,
    },
  });

  const productsData = [
    {
      sku: "HW-SRV-01",
      name: "Enterprise Edge Server 2U",
      description: "Dual AMD EPYC, 64GB DDR5 ECC RAM, Hot-swap Redundant Power, 2x 10GbE SFP+",
      categoryId: catHardware.id,
      basePrice: 4500.0,
      costPrice: 2925.0,
      unit: UnitType.UNIT,
      taxRate: 0.08,
      isPromoted: true,
    },
    {
      sku: "HW-NET-01",
      name: "Gigabit Managed Switch 48-Port",
      description: "L3 Managed Switch, 48x 1GbE RJ45 + 4x 10G SFP+ Uplinks, PoE+ 740W",
      categoryId: catHardware.id,
      basePrice: 1200.0,
      costPrice: 780.0,
      unit: UnitType.UNIT,
      taxRate: 0.08,
      isPromoted: false,
    },
    {
      sku: "HW-TERM-01",
      name: "POS Rugged Industrial Terminal",
      description: "IP65 Rated All-in-One Touchscreen Terminal, Barcode & NFC reader integrated",
      categoryId: catHardware.id,
      basePrice: 850.0,
      costPrice: 550.0,
      unit: UnitType.UNIT,
      taxRate: 0.08,
      isPromoted: false,
    },
    {
      sku: "SRV-INST-01",
      name: "On-Site Hardware Deployment & Commissioning",
      description: "Rack mounting, cable management, firmware update, and high-availability verification",
      categoryId: catServices.id,
      basePrice: 2500.0,
      costPrice: 1000.0,
      unit: UnitType.PROJECT,
      taxRate: 0.0,
      isPromoted: true,
    },
    {
      sku: "SRV-MIG-01",
      name: "Legacy ERP & CRM Cloud Migration Service",
      description: "Full ETL migration of sales history, catalog, customer records, and ledger mapping",
      categoryId: catServices.id,
      basePrice: 6000.0,
      costPrice: 2400.0,
      unit: UnitType.PROJECT,
      taxRate: 0.0,
      isPromoted: false,
    },
    {
      sku: "SRV-SLA-01",
      name: "24/7 Dedicated Support SLA (Annual)",
      description: "15-minute guaranteed critical incident response, designated solutions engineer",
      categoryId: catServices.id,
      basePrice: 1800.0,
      costPrice: 720.0,
      unit: UnitType.YEAR,
      taxRate: 0.0,
      isPromoted: true,
    },
    {
      sku: "SUB-CORE-01",
      name: "DealFlow 360 Core Platform License",
      description: "Per-seat monthly license for sales reps, CPQ quotation builder, and workflow routing",
      categoryId: catSubscriptions.id,
      basePrice: 120.0,
      costPrice: 18.0,
      unit: UnitType.USER_MONTH,
      taxRate: 0.0,
      isPromoted: true,
    },
    {
      sku: "SUB-AI-01",
      name: "AI Deal Governance & Risk Engine Add-on",
      description: "Real-time margin anomaly detection, predictive approval routing, and upsell ranker",
      categoryId: catSubscriptions.id,
      basePrice: 80.0,
      costPrice: 12.0,
      unit: UnitType.USER_MONTH,
      taxRate: 0.0,
      isPromoted: true,
    },
    {
      sku: "SUB-ANLY-01",
      name: "Executive Sales Performance & Analytics Suite",
      description: "Pipeline velocity tracking, rep quota attribution, and automated exportable reports",
      categoryId: catSubscriptions.id,
      basePrice: 250.0,
      costPrice: 35.0,
      unit: UnitType.MONTH,
      taxRate: 0.0,
      isPromoted: false,
    },
  ];

  const products: Record<string, any> = {};
  for (const p of productsData) {
    products[p.sku] = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        unit: p.unit,
        taxRate: p.taxRate,
        isPromoted: p.isPromoted,
        organizationId: org.id,
        isActive: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        unit: p.unit,
        taxRate: p.taxRate,
        isPromoted: p.isPromoted,
        organizationId: org.id,
        isActive: true,
      },
    });
  }

  // Stock Quantities (Enabling split fulfillment demonstration)
  const stockAllocations = [
    // Main Warehouse (Denver) - Heavy stock
    { warehouseId: warehouses["wh-denver-01"].id, productId: products["HW-SRV-01"].id, onHand: 25, reserved: 3 },
    { warehouseId: warehouses["wh-denver-01"].id, productId: products["HW-NET-01"].id, onHand: 60, reserved: 5 },
    { warehouseId: warehouses["wh-denver-01"].id, productId: products["HW-TERM-01"].id, onHand: 80, reserved: 10 },
    // East Depot (Newark) - Partial stock for split demonstration
    { warehouseId: warehouses["wh-newark-02"].id, productId: products["HW-SRV-01"].id, onHand: 8, reserved: 0 },
    { warehouseId: warehouses["wh-newark-02"].id, productId: products["HW-NET-01"].id, onHand: 20, reserved: 2 },
    { warehouseId: warehouses["wh-newark-02"].id, productId: products["HW-TERM-01"].id, onHand: 30, reserved: 0 },
    // West Hub (San Jose) - Fast regional stock
    { warehouseId: warehouses["wh-sanjose-03"].id, productId: products["HW-SRV-01"].id, onHand: 12, reserved: 2 },
    { warehouseId: warehouses["wh-sanjose-03"].id, productId: products["HW-NET-01"].id, onHand: 15, reserved: 0 },
    { warehouseId: warehouses["wh-sanjose-03"].id, productId: products["HW-TERM-01"].id, onHand: 25, reserved: 0 },
  ];

  for (const st of stockAllocations) {
    await prisma.stockLevel.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: st.warehouseId,
          productId: st.productId,
        },
      },
      update: {
        quantityOnHand: st.onHand,
        quantityReserved: st.reserved,
      },
      create: {
        warehouseId: st.warehouseId,
        productId: st.productId,
        quantityOnHand: st.onHand,
        quantityReserved: st.reserved,
      },
    });
  }
  console.log("  ✓ Real-time stock levels populated across Denver, Newark, and San Jose.");

  // 8. Quotations Across All 5 Pipeline Stages
  console.log("\n[7/8] Seeding Quotations & Deal Pipeline across all stages...");

  // QUOTE 1: DRAFT (Acme Corp / Alex Rivera - Healthy margins, rep discretion)
  const q1 = await prisma.quotation.upsert({
    where: { quoteNumber: "QT-2026-0001" },
    update: {
      stage: QuoteStage.DRAFT,
    },
    create: {
      quoteNumber: "QT-2026-0001",
      title: "Acme Corp - Q3 Data Center & Cloud Expansion",
      customerId: customers["cust-acme-01"].id,
      salesRepId: salesRepAlex.id,
      organizationId: org.id,
      stage: QuoteStage.DRAFT,
      subtotal: 12000.0,
      discountTotal: 270.0,
      taxTotal: 698.40,
      grandTotal: 12428.40,
      totalCost: 6300.0,
      grossMargin: 5430.0,
      grossMarginPercent: 46.29,
      blendedRiskScore: 2.5,
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      approvalStatus: ApprovalStatus.APPROVED,
      portalToken: "portal-token-acme-draft-01",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Draft configuration prepared during weekly sync.",
    },
  });

  // Lines for Q1
  await prisma.quotationLine.deleteMany({ where: { quotationId: q1.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q1.id,
        productId: products["HW-SRV-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "Enterprise Edge Server 2U",
        quantity: 2,
        unitPrice: 4500.0,
        costPrice: 2925.0,
        discountPercent: 3.0,
        discountAmount: 270.0,
        netPrice: 8730.0,
        totalCost: 5850.0,
        lineMargin: 2880.0,
        lineMarginPercent: 32.99,
        categoryCeiling: 15.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 0.0,
        sortOrder: 1,
      },
      {
        quotationId: q1.id,
        productId: products["SUB-CORE-01"].id,
        itemType: CategoryType.SUBSCRIPTION,
        description: "DealFlow 360 Core Platform License (15 Seats)",
        quantity: 15,
        unitPrice: 120.0,
        costPrice: 18.0,
        discountPercent: 0.0,
        discountAmount: 0.0,
        netPrice: 1800.0,
        totalCost: 270.0,
        lineMargin: 1530.0,
        lineMarginPercent: 85.0,
        categoryCeiling: 12.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 0.0,
        sortOrder: 2,
      },
      {
        quotationId: q1.id,
        productId: products["SUB-AI-01"].id,
        itemType: CategoryType.SUBSCRIPTION,
        description: "AI Deal Governance Add-on (15 Seats)",
        quantity: 15,
        unitPrice: 80.0,
        costPrice: 12.0,
        discountPercent: 0.0,
        discountAmount: 0.0,
        netPrice: 1200.0,
        totalCost: 180.0,
        lineMargin: 1020.0,
        lineMarginPercent: 85.0,
        categoryCeiling: 12.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 0.0,
        sortOrder: 3,
      },
    ],
  });
  console.log("  ✓ Quotation [QT-2026-0001] (DRAFT - Normal Discretion)");

  // QUOTE 2: PENDING_APPROVAL (Beta Industries / Sarah Chen - Category Ceiling Breach)
  const q2 = await prisma.quotation.upsert({
    where: { quoteNumber: "QT-2026-0002" },
    update: {
      stage: QuoteStage.PENDING_APPROVAL,
    },
    create: {
      quoteNumber: "QT-2026-0002",
      title: "Beta Industries - ERP Migration & Network Overhaul",
      customerId: customers["cust-beta-02"].id,
      salesRepId: salesRepSarah.id,
      organizationId: org.id,
      stage: QuoteStage.PENDING_APPROVAL,
      subtotal: 10800.0,
      discountTotal: 1464.0,
      taxTotal: 353.28,
      grandTotal: 9689.28,
      totalCost: 5520.0,
      grossMargin: 3816.0,
      grossMarginPercent: 40.87,
      blendedRiskScore: 28.5, // High risk triggers Manager + Finance 2-step review
      requiresManagerApproval: true,
      requiresFinanceApproval: true,
      approvalStatus: ApprovalStatus.PENDING,
      portalToken: "portal-token-beta-pending-02",
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      notes: "Customer demanded 18% discount on Migration Service to close this quarter.",
    },
  });

  await prisma.quotationLine.deleteMany({ where: { quotationId: q2.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q2.id,
        productId: products["SRV-MIG-01"].id,
        itemType: CategoryType.SERVICE,
        description: "Legacy ERP & CRM Cloud Migration Service (Exceeds 10% Service Ceiling)",
        quantity: 1,
        unitPrice: 6000.0,
        costPrice: 2400.0,
        discountPercent: 18.0, // Exceeds 10% limit by 8%!
        discountAmount: 1080.0,
        netPrice: 4920.0,
        totalCost: 2400.0,
        lineMargin: 2520.0,
        lineMarginPercent: 51.22,
        categoryCeiling: 10.0,
        customerCeiling: 10.0,
        isCeilingBreached: true,
        riskPoints: 18.0,
        sortOrder: 1,
      },
      {
        quotationId: q2.id,
        productId: products["HW-NET-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "Gigabit Managed Switch 48-Port",
        quantity: 4,
        unitPrice: 1200.0,
        costPrice: 780.0,
        discountPercent: 8.0,
        discountAmount: 384.0,
        netPrice: 4416.0,
        totalCost: 3120.0,
        lineMargin: 1296.0,
        lineMarginPercent: 29.35,
        categoryCeiling: 15.0,
        customerCeiling: 10.0,
        isCeilingBreached: false,
        riskPoints: 4.5,
        sortOrder: 2,
      },
    ],
  });

  // Create active 2-step Approval Request
  await prisma.approvalRequest.deleteMany({ where: { quotationId: q2.id } });
  const appReq2 = await prisma.approvalRequest.create({
    data: {
      quotationId: q2.id,
      status: ApprovalStatus.PENDING,
      escalationLevel: "SALES_MANAGER_AND_FINANCE",
      currentStep: 1,
      blendedRiskScore: 28.5,
    },
  });

  await prisma.approvalStep.createMany({
    data: [
      {
        approvalRequestId: appReq2.id,
        stepNumber: 1,
        level: ApprovalLevel.SALES_MANAGER,
        status: ApprovalStatus.PENDING,
        reviewerId: "usr-mgr-01",
        comments: null,
      },
      {
        approvalRequestId: appReq2.id,
        stepNumber: 2,
        level: ApprovalLevel.FINANCE,
        status: ApprovalStatus.PENDING,
        reviewerId: "usr-fin-01",
        comments: null,
      },
    ],
  });

  await prisma.approvalAuditLog.create({
    data: {
      quotationId: q2.id,
      organizationId: org.id,
      actorId: "usr-rep-02",
      actorRole: UserRole.SALES_REP,
      action: "SUBMITTED_FOR_APPROVAL",
      reason: "Quotation line 1 [SRV-MIG-01] discount of 18% breaches category ceiling of 10%.",
      metadata: { blendedRiskScore: 28.5, escalation: "SALES_MANAGER_AND_FINANCE" },
    },
  });
  console.log("  ✓ Quotation [QT-2026-0002] (PENDING_APPROVAL - 2-Step Escalation)");

  // QUOTE 3: APPROVED (OmniCorp / Alex Rivera - Manager Sign-off Recorded)
  const q3 = await prisma.quotation.upsert({
    where: { quoteNumber: "QT-2026-0003" },
    update: {
      stage: QuoteStage.APPROVED,
    },
    create: {
      quoteNumber: "QT-2026-0003",
      title: "OmniCorp - Global Terminal Deployment",
      customerId: customers["cust-omni-03"].id,
      salesRepId: salesRepAlex.id,
      organizationId: org.id,
      stage: QuoteStage.APPROVED,
      subtotal: 11000.0,
      discountTotal: 805.0,
      taxTotal: 625.60,
      grandTotal: 10820.60,
      totalCost: 6500.0,
      grossMargin: 3695.0,
      grossMarginPercent: 36.24,
      blendedRiskScore: 12.0,
      requiresManagerApproval: true,
      requiresFinanceApproval: false,
      approvalStatus: ApprovalStatus.APPROVED,
      portalToken: "portal-token-omni-approved-03",
      expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      notes: "Approved by Elena Rostova for competitive displacement against legacy vendor.",
    },
  });

  await prisma.quotationLine.deleteMany({ where: { quotationId: q3.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q3.id,
        productId: products["HW-TERM-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "POS Rugged Industrial Terminal (10 units)",
        quantity: 10,
        unitPrice: 850.0,
        costPrice: 550.0,
        discountPercent: 8.0,
        discountAmount: 680.0,
        netPrice: 7820.0,
        totalCost: 5500.0,
        lineMargin: 2320.0,
        lineMarginPercent: 29.67,
        categoryCeiling: 15.0,
        customerCeiling: 5.0,
        isCeilingBreached: true, // Bronze tier limit is 5%
        riskPoints: 8.0,
        sortOrder: 1,
      },
      {
        quotationId: q3.id,
        productId: products["SRV-INST-01"].id,
        itemType: CategoryType.SERVICE,
        description: "On-Site Hardware Deployment",
        quantity: 1,
        unitPrice: 2500.0,
        costPrice: 1000.0,
        discountPercent: 5.0,
        discountAmount: 125.0,
        netPrice: 2375.0,
        totalCost: 1000.0,
        lineMargin: 1375.0,
        lineMarginPercent: 57.89,
        categoryCeiling: 10.0,
        customerCeiling: 5.0,
        isCeilingBreached: false,
        riskPoints: 2.0,
        sortOrder: 2,
      },
    ],
  });

  await prisma.approvalRequest.deleteMany({ where: { quotationId: q3.id } });
  const appReq3 = await prisma.approvalRequest.create({
    data: {
      quotationId: q3.id,
      status: ApprovalStatus.APPROVED,
      escalationLevel: "SALES_MANAGER",
      currentStep: 1,
      blendedRiskScore: 12.0,
    },
  });

  await prisma.approvalStep.create({
    data: {
      approvalRequestId: appReq3.id,
      stepNumber: 1,
      level: ApprovalLevel.SALES_MANAGER,
      status: ApprovalStatus.APPROVED,
      reviewerId: "usr-mgr-01",
      comments: "Approved discount. Strategic displacement opportunity against competitor.",
      actionedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      quotationId: q3.id,
      organizationId: org.id,
      actorId: "usr-mgr-01",
      actorRole: UserRole.SALES_MANAGER,
      action: "APPROVED_BY_MANAGER",
      reason: "Approved discount. Strategic displacement opportunity against competitor.",
      metadata: { approvedBy: "Elena Rostova", discountGranted: "8.0%" },
    },
  });
  console.log("  ✓ Quotation [QT-2026-0003] (APPROVED - Audit Log Attached)");

  // QUOTE 4: NEGOTIATION (QuantumLeap / Sarah Chen - Live Portal Link Active)
  const q4 = await prisma.quotation.upsert({
    where: { quoteNumber: "QT-2026-0004" },
    update: {
      stage: QuoteStage.NEGOTIATION,
    },
    create: {
      quoteNumber: "QT-2026-0004",
      title: "QuantumLeap AI - Infrastructure & Platform Suite",
      customerId: customers["cust-quantum-04"].id,
      salesRepId: salesRepSarah.id,
      organizationId: org.id,
      stage: QuoteStage.NEGOTIATION,
      subtotal: 22800.0,
      discountTotal: 2550.0,
      taxTotal: 1267.20,
      grandTotal: 21517.20,
      totalCost: 12820.0,
      grossMargin: 7430.0,
      grossMarginPercent: 36.69,
      blendedRiskScore: 6.8,
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      approvalStatus: ApprovalStatus.APPROVED,
      portalToken: "portal-token-quantum-04",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      notes: "Customer currently evaluating portal quotation.",
    },
  });

  await prisma.quotationLine.deleteMany({ where: { quotationId: q4.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q4.id,
        productId: products["HW-SRV-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "Enterprise Edge Server 2U (4 units)",
        quantity: 4,
        unitPrice: 4500.0,
        costPrice: 2925.0,
        discountPercent: 12.0,
        discountAmount: 2160.0,
        netPrice: 15840.0,
        totalCost: 11700.0,
        lineMargin: 4140.0,
        lineMarginPercent: 26.14,
        categoryCeiling: 15.0,
        customerCeiling: 20.0, // Platinum tier allows 20%
        isCeilingBreached: false,
        riskPoints: 3.5,
        sortOrder: 1,
      },
      {
        quotationId: q4.id,
        productId: products["SUB-CORE-01"].id,
        itemType: CategoryType.SUBSCRIPTION,
        description: "DealFlow 360 Core Platform License (25 Seats)",
        quantity: 25,
        unitPrice: 120.0,
        costPrice: 18.0,
        discountPercent: 10.0,
        discountAmount: 300.0,
        netPrice: 2700.0,
        totalCost: 450.0,
        lineMargin: 2250.0,
        lineMarginPercent: 83.33,
        categoryCeiling: 12.0,
        customerCeiling: 20.0,
        isCeilingBreached: false,
        riskPoints: 2.0,
        sortOrder: 2,
      },
      {
        quotationId: q4.id,
        productId: products["SRV-SLA-01"].id,
        itemType: CategoryType.SERVICE,
        description: "24/7 Dedicated Support SLA (Annual)",
        quantity: 1,
        unitPrice: 1800.0,
        costPrice: 720.0,
        discountPercent: 5.0,
        discountAmount: 90.0,
        netPrice: 1710.0,
        totalCost: 720.0,
        lineMargin: 990.0,
        lineMarginPercent: 57.89,
        categoryCeiling: 10.0,
        customerCeiling: 20.0,
        isCeilingBreached: false,
        riskPoints: 1.0,
        sortOrder: 3,
      },
    ],
  });
  console.log("  ✓ Quotation [QT-2026-0004] (NEGOTIATION - Portal Token Ready)");

  // QUOTE 5: CONFIRMED (Acme Corp / Alex Rivera - Ready for fulfillment & billing)
  const q5 = await prisma.quotation.upsert({
    where: { quoteNumber: "QT-2026-0005" },
    update: {
      stage: QuoteStage.CONFIRMED,
    },
    create: {
      quoteNumber: "QT-2026-0005",
      title: "Acme Corp - Core Infrastructure Expansion",
      customerId: customers["cust-acme-01"].id,
      salesRepId: salesRepAlex.id,
      organizationId: org.id,
      stage: QuoteStage.CONFIRMED,
      subtotal: 18400.0,
      discountTotal: 1200.0,
      taxTotal: 1272.0,
      grandTotal: 18472.0,
      totalCost: 11335.0,
      grossMargin: 5865.0,
      grossMarginPercent: 34.1,
      blendedRiskScore: 4.2,
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      approvalStatus: ApprovalStatus.APPROVED,
      portalToken: "portal-token-acme-confirmed-05",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      notes: "Deal finalized and executed by customer via negotiation portal.",
    },
  });

  await prisma.quotationLine.deleteMany({ where: { quotationId: q5.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q5.id,
        productId: products["HW-SRV-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "Enterprise Edge Server 2U (3 units)",
        quantity: 3,
        unitPrice: 4500.0,
        costPrice: 2925.0,
        discountPercent: 5.0,
        discountAmount: 675.0,
        netPrice: 12825.0,
        totalCost: 8775.0,
        lineMargin: 4050.0,
        lineMarginPercent: 31.58,
        categoryCeiling: 15.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 0.0,
        sortOrder: 1,
      },
      {
        quotationId: q5.id,
        productId: products["HW-NET-01"].id,
        itemType: CategoryType.HARDWARE,
        description: "Gigabit Managed Switch 48-Port (2 units)",
        quantity: 2,
        unitPrice: 1200.0,
        costPrice: 780.0,
        discountPercent: 10.0,
        discountAmount: 240.0,
        netPrice: 2160.0,
        totalCost: 1560.0,
        lineMargin: 600.0,
        lineMarginPercent: 27.78,
        categoryCeiling: 15.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 2.0,
        sortOrder: 2,
      },
      {
        quotationId: q5.id,
        productId: products["SRV-INST-01"].id,
        itemType: CategoryType.SERVICE,
        description: "On-Site Hardware Deployment",
        quantity: 1,
        unitPrice: 2500.0,
        costPrice: 1000.0,
        discountPercent: 10.0,
        discountAmount: 250.0,
        netPrice: 2250.0,
        totalCost: 1000.0,
        lineMargin: 1250.0,
        lineMarginPercent: 55.56,
        categoryCeiling: 10.0,
        customerCeiling: 15.0,
        isCeilingBreached: false,
        riskPoints: 2.0,
        sortOrder: 3,
      },
    ],
  });
  console.log("  ✓ Quotation [QT-2026-0005] (CONFIRMED - Ready for Fulfillment & Billing)");

  console.log("\n==================================================");
  console.log("  🎉 Seeding Completed Successfully!");
  console.log("==================================================");
  console.log("Pipeline Sample Deals:");
  console.log("  📝 QT-2026-0001 : DRAFT            (Acme Corp - $12,428, 46.3% margin)");
  console.log("  ⏳ QT-2026-0002 : PENDING_APPROVAL (Beta Ind - $9,689, 2-Step Escalation)");
  console.log("  ✅ QT-2026-0003 : APPROVED         (OmniCorp - $10,820, Manager Approved)");
  console.log("  💬 QT-2026-0004 : NEGOTIATION      (QuantumLeap - $21,517, Portal Token: portal-token-quantum-04)");
  console.log("  🎯 QT-2026-0005 : CONFIRMED        (Acme Corp - $18,472, Ready for Split Fulfillment)");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "./src/index.js";

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: "DevAlly" } });
  if (!org) return;

  const tiers = await prisma.customerTier.findMany({ where: { organizationId: org.id } });
  const bronze = tiers.find(t => t.code === "BRONZE");
  const silver = tiers.find(t => t.code === "SILVER");
  const gold = tiers.find(t => t.code === "GOLD");

  const priceLists = await prisma.priceList.findMany({ where: { organizationId: org.id } });
  for (const pl of priceLists) {
    let tierId = pl.customerTierId;
    if (pl.name.toLowerCase().includes("bronze") && bronze) tierId = bronze.id;
    if (pl.name.toLowerCase().includes("silver") && silver) tierId = silver.id;
    if (pl.name.toLowerCase().includes("gold") && gold) tierId = gold.id;

    await prisma.priceList.update({
      where: { id: pl.id },
      data: {
        currency: "INR",
        customerTierId: tierId,
      },
    });
  }
  console.log("Updated DevAlly price lists to INR and linked tiers.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

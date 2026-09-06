import { prisma, BillingInterval } from "@repo/db";
import { createSubscriptionPlan, listSubscriptions } from "../apps/api/src/services/billing.service.js";

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log("No organization found");
    return;
  }
  const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
  const product = await prisma.product.findFirst({ where: { organizationId: org.id } });

  console.log("Org:", org.id, "Customer:", customer?.id, "Product:", product?.id);

  if (customer && product) {
    try {
      const sub = await createSubscriptionPlan(org.id, {
        customerId: customer.id,
        productId: product.id,
        planName: "Enterprise Care 2yr",
        billingInterval: BillingInterval.MONTHLY,
        unitPrice: 199,
        quantity: 1,
        discountPercent: 10,
        notes: "Test plan creation",
        autoRenew: true,
        enableReminder: false,
      });
      console.log("Created sub successfully:", sub.id, sub.subscriptionNumber);
    } catch (err: any) {
      console.error("Error creating sub:", err);
    }
  }

  const list = await listSubscriptions(org.id);
  console.log("Total subs in DB:", list.total, list.subscriptions.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

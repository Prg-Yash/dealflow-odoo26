import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");

    const stockLevels = await prisma.stockLevel.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
            shippingCostWeight: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            basePrice: true,
            costPrice: true,
          },
        },
      },
      orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
    });

    const enriched = stockLevels.map((s) => {
      const onHand = s.quantityOnHand;
      const reserved = s.quantityReserved;
      const available = Math.max(0, onHand - reserved);

      return {
        ...s,
        quantityOnHand: onHand,
        quantityReserved: reserved,
        quantityAvailable: available,
        onHand,
        reserved,
        available,
        isBelowReorderPoint: available <= s.reorderPoint,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      stockLevels: enriched,
    });
  } catch (error: any) {
    console.error("Failed to fetch stock levels:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stock levels" },
      { status: 500 }
    );
  }
}

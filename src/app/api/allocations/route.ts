import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const buildId = body.buildId as string | undefined;
    const stageId = body.stageId as number | undefined;
    const itemId = body.itemId as string | undefined;
    const qty = body.qty as number | undefined;

    if (!buildId || !stageId || !itemId || !qty) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO allocations (build_id, stage_id, item_id, qty_allocated, status)
      VALUES (${buildId}::bigint, ${stageId}::bigint, ${itemId}::bigint, ${
        qty as number
      }, 'reserved')
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Allocation API error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

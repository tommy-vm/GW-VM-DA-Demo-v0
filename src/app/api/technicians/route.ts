import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const technicians = await prisma.$queryRaw<
      { id: string; display_name: string; title: string | null }[]
    >`
      SELECT id::text AS id, display_name, title
      FROM technicians
      WHERE active = true
      ORDER BY display_name ASC
    `;

    return NextResponse.json({ technicians });
  } catch (error) {
    console.warn("Technician list error", error);
    return NextResponse.json({ technicians: [] }, { status: 200 });
  }
}

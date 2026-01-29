import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const statusMap: Record<string, string> = {
  START: "IN_PROGRESS",
  RESUME: "IN_PROGRESS",
  UNBLOCK: "IN_PROGRESS",
  PAUSE: "PAUSED",
  COMPLETE: "DONE",
  BLOCK: "BLOCKED"
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = body.taskId as string | undefined;
    const eventType = body.eventType as string | undefined;
    const note = (body.note as string | null | undefined) ?? null;

    if (!taskId || !eventType) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const nextStatus = statusMap[eventType] ?? "NOT_STARTED";

    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO task_events (task_id, event_type, note)
        VALUES (${taskId}::bigint, ${eventType}::task_event_type, ${note})
      `,
      prisma.$executeRaw`
        UPDATE tasks
        SET status = ${nextStatus}::task_status,
            updated_at = now()
        WHERE id = ${taskId}::bigint
      `
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Task event API error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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
    const technicianId = body.technicianId as string | undefined;

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
      `,
      technicianId
        ? prisma.$executeRaw`
            WITH task_phase AS (
              SELECT phase_id FROM tasks WHERE id = ${taskId}::bigint
            )
            INSERT INTO work_sessions (technician_id, task_id, station_id, started_at, notes)
            SELECT ${technicianId}::bigint, ${taskId}::bigint, task_phase.phase_id, now(), ${note}
            FROM task_phase
            WHERE ${eventType} IN ('START', 'RESUME')
          `
        : prisma.$executeRaw`SELECT 1`,
      technicianId
        ? prisma.$executeRaw`
            UPDATE work_sessions
            SET ended_at = now(), notes = ${note}
            WHERE technician_id = ${technicianId}::bigint
              AND task_id = ${taskId}::bigint
              AND ended_at IS NULL
              AND ${eventType} IN ('PAUSE','BLOCK','COMPLETE')
          `
        : prisma.$executeRaw`SELECT 1`
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Task event API error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

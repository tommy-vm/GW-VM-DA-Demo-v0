import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";
import { TechnicianTask } from "@/components/technician/TaskActionCard";
import QuickLogClient from "@/components/technician/QuickLogClient";

export const dynamic = "force-dynamic";

type TaskRow = {
  id: string;
  build_code: string | null;
  name: string | null;
  phase: string | null;
  status: string | null;
  block_reason: string | null;
  block_at: Date | string | null;
};

export default async function FloorQuickLog() {
  const tasks = await safeQueryUnsafe<TaskRow[]>(
    `SELECT t.id::text AS id,
            b.code AS build_code,
            t.name,
            p.name AS phase,
            t.status::text AS status,
            block_event.note AS block_reason,
            block_event.occurred_at AS block_at
     FROM tasks t
     JOIN builds b ON b.id = t.build_id
     LEFT JOIN phases p ON p.id = t.phase_id
     LEFT JOIN LATERAL (
       SELECT note, occurred_at
       FROM task_events
       WHERE task_id = t.id AND event_type = 'BLOCK'
       ORDER BY occurred_at DESC
       LIMIT 1
     ) block_event ON true
     WHERE t.status IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'BLOCKED')
     ORDER BY t.updated_at DESC NULLS LAST
     LIMIT 50`,
    [],
    []
  );

  const formattedTasks: TechnicianTask[] = tasks.map((task) => ({
    id: task.id,
    buildCode: task.build_code,
    title: task.name,
    phase: task.phase,
    status: task.status,
    blockReason: task.block_reason,
    blockAt: task.block_at ? new Date(task.block_at).toISOString() : null
  }));

  return (
    <section className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician Mode
        </div>
        <h2 className="mt-2 text-4xl font-semibold">Quick Log</h2>
        <p className="mt-2 text-base text-slate-300">
          Minimal taps to log task progress on the shop floor.
        </p>
      </div>

      {formattedTasks.length === 0 ? (
        <EmptyState
          title="No active tasks to log"
          description="Active tasks will show here for quick updates."
        />
      ) : (
        <QuickLogClient tasks={formattedTasks} />
      )}
    </section>
  );
}

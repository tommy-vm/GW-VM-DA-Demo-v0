import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";
import StationViewClient, {
  StationTask
} from "@/components/technician/StationViewClient";

export const dynamic = "force-dynamic";

type StationTaskRow = {
  id: string;
  build_code: string | null;
  model: string | null;
  task_name: string | null;
  phase: string | null;
  status: string | null;
  block_reason: string | null;
  block_at: Date | string | null;
};

export default async function StationPage() {
  const tasks = await safeQueryUnsafe<StationTaskRow[]>(
    `SELECT t.id::text AS id,
            b.code AS build_code,
            b.model,
            t.name AS task_name,
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
     WHERE t.status IN ('IN_PROGRESS', 'PAUSED', 'NOT_STARTED', 'BLOCKED')
     ORDER BY t.updated_at DESC NULLS LAST
     LIMIT 200`,
    [],
    []
  );

  const formatted: StationTask[] = tasks.map((task) => ({
    id: task.id,
    buildCode: task.build_code,
    model: task.model,
    title: task.task_name,
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
        <h2 className="mt-2 text-4xl font-semibold">Station</h2>
        <p className="mt-2 text-base text-slate-300">
          Station-first workflow with NOW, NEXT, and BLOCKED queues.
        </p>
      </div>

      {formatted.length === 0 ? (
        <EmptyState
          title="No station tasks available"
          description="Active tasks will appear here once assigned."
        />
      ) : (
        <StationViewClient tasks={formatted} />
      )}
    </section>
  );
}

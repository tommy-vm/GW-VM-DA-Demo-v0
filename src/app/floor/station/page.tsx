import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";
import { cookies } from "next/headers";
import StationViewClient, {
  StationRequirement,
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

type TaskShortageRow = {
  task_id: string;
  phase: string | null;
  sku: string | null;
  name: string | null;
  shortage: number | null;
};

export default async function StationPage() {
  const techId = cookies().get("gw_tech_id")?.value ?? null;
  if (!techId) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Technician Mode
          </div>
          <h2 className="mt-2 text-4xl font-semibold">Station</h2>
          <p className="mt-2 text-base text-slate-300">
            Select a technician to view station work.
          </p>
        </div>
        <EmptyState
          title="Technician not selected"
          description="Choose a technician from the sidebar to load station queues."
        />
      </section>
    );
  }

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
     JOIN task_assignments ta ON ta.task_id = t.id
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
       AND ta.technician_id = $1::bigint
     ORDER BY t.updated_at DESC NULLS LAST
     LIMIT 200`,
    [techId],
    []
  );

  const taskShortages = tasks.length
    ? await safeQueryUnsafe<TaskShortageRow[]>(
        `SELECT tr.task_id::text AS task_id,
                p.name AS phase,
                i.sku,
                i.name,
                (tr.required_qty - (COALESCE(ib.on_hand_qty, 0) - COALESCE(ib.allocated_qty, 0)))::float8 AS shortage
         FROM task_requirements tr
         JOIN tasks t ON t.id = tr.task_id
         JOIN task_assignments ta ON ta.task_id = t.id
         LEFT JOIN phases p ON p.id = t.phase_id
         JOIN items i ON i.id = tr.item_id
         LEFT JOIN inventory_balance ib ON ib.item_id = tr.item_id
         WHERE tr.task_id = ANY($1::bigint[])
           AND ta.technician_id = $2::bigint
           AND tr.required_qty > (COALESCE(ib.on_hand_qty, 0) - COALESCE(ib.allocated_qty, 0))`,
        [tasks.map((task) => task.id), techId],
        []
      )
    : [];

  const shortageMap = taskShortages.reduce<Record<string, string[]>>(
    (acc, row) => {
      const list = acc[row.task_id] ?? [];
      const label = row.sku ?? row.name ?? "item";
      acc[row.task_id] = [...list, label];
      return acc;
    },
    {}
  );

  const formatted: StationTask[] = tasks.map((task) => ({
    id: task.id,
    buildCode: task.build_code,
    model: task.model,
    title: task.task_name,
    phase: task.phase,
    status: task.status,
    blockReason: task.block_reason,
    blockAt: task.block_at ? new Date(task.block_at).toISOString() : null,
    shortageParts: shortageMap[task.id] ?? []
  }));

  const formattedRequirements: StationRequirement[] = taskShortages.map(
    (row) => ({
      phase: row.phase,
      sku: row.sku,
      name: row.name,
      shortageQty: row.shortage ?? 0
    })
  );

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician Mode
        </div>
        <h2 className="mt-2 text-4xl font-semibold">Station</h2>
        <p className="mt-2 text-base text-slate-300">
          Station-first workflow with NOW, NEXT, and BLOCKED queues.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {formatted.length === 0 ? (
          <EmptyState
            title="No station tasks available"
            description="Active tasks will appear here once assigned."
          />
        ) : (
          <StationViewClient tasks={formatted} requirements={formattedRequirements} />
        )}
      </div>
    </section>
  );
}

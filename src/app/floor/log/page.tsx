import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";
import { TechnicianTask } from "@/components/technician/TaskActionCard";
import QuickLogClient from "@/components/technician/QuickLogClient";
import { cookies } from "next/headers";

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

type TaskShortageRow = {
  task_id: string;
  sku: string | null;
  name: string | null;
};

export default async function FloorQuickLog() {
  const techId = cookies().get("gw_tech_id")?.value ?? null;
  if (!techId) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Technician Mode
          </div>
          <h2 className="mt-2 text-4xl font-semibold">Quick Log</h2>
          <p className="mt-2 text-base text-slate-300">
            Select a technician to view assigned tasks.
          </p>
        </div>
        <EmptyState
          title="Technician not selected"
          description="Choose a technician from the sidebar to load Quick Log."
        />
      </section>
    );
  }

  const tasks = await safeQueryUnsafe<TaskRow[]>(
    `SELECT t.id::text AS id,
            b.code AS build_code,
            t.name,
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
     WHERE t.status IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'BLOCKED')
       AND ta.technician_id = $1::bigint
     ORDER BY t.updated_at DESC NULLS LAST
     LIMIT 50`,
    [techId],
    []
  );

  const taskShortages = tasks.length
    ? await safeQueryUnsafe<TaskShortageRow[]>(
        `SELECT tr.task_id::text AS task_id,
                i.sku,
                i.name
         FROM task_requirements tr
         JOIN items i ON i.id = tr.item_id
         JOIN task_assignments ta ON ta.task_id = tr.task_id
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

  const formattedTasks: TechnicianTask[] = tasks.map((task) => ({
    id: task.id,
    buildCode: task.build_code,
    title: task.name,
    phase: task.phase,
    status: task.status,
    blockReason: task.block_reason,
    blockAt: task.block_at ? new Date(task.block_at).toISOString() : null,
    shortageParts: shortageMap[task.id] ?? []
  }));

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician Mode
        </div>
        <h2 className="mt-2 text-4xl font-semibold">Quick Log</h2>
        <p className="mt-2 text-base text-slate-300">
          Minimal taps to log task progress on the shop floor.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {formattedTasks.length === 0 ? (
          <EmptyState
            title="No active tasks to log"
            description="Active tasks will show here for quick updates."
          />
        ) : (
          <QuickLogClient tasks={formattedTasks} />
        )}
      </div>
    </section>
  );
}

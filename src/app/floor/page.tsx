import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { safeQueryUnsafe } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type FloorBuildRow = {
  id: string;
  code: string | null;
  model: string | null;
  status: string | null;
  phase: string | null;
  task_name: string | null;
  task_status: string | null;
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default async function FloorTodayBoard() {
  const techId = cookies().get("gw_tech_id")?.value ?? null;
  if (!techId) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Technician Mode
          </div>
          <h2 className="mt-2 text-4xl font-semibold">Today Board</h2>
          <p className="mt-2 text-base text-slate-300">
            Select a technician to view assigned builds.
          </p>
        </div>
        <EmptyState
          title="Technician not selected"
          description="Choose a technician from the sidebar to load Today Board."
        />
      </section>
    );
  }

  const rows = await safeQueryUnsafe<FloorBuildRow[]>(
    `WITH latest_tasks AS (
       SELECT
         t.build_id,
         t.name AS task_name,
         t.status::text AS task_status,
         p.name AS phase,
         ROW_NUMBER() OVER (PARTITION BY t.build_id ORDER BY t.updated_at DESC) AS rn
       FROM tasks t
       JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN phases p ON p.id = t.phase_id
       WHERE t.status IN ('IN_PROGRESS', 'PAUSED', 'BLOCKED', 'NOT_STARTED')
         AND ta.technician_id = $1::bigint
     )
     SELECT
       b.id::text AS id,
       b.code,
       b.model,
       b.status::text AS status,
       lt.phase,
       lt.task_name,
       lt.task_status
     FROM builds b
     LEFT JOIN latest_tasks lt ON lt.build_id = b.id AND lt.rn = 1
     ORDER BY lt.phase NULLS LAST, b.updated_at DESC NULLS LAST
     LIMIT 50`,
    [techId],
    []
  );

  const grouped = rows.reduce<Record<string, FloorBuildRow[]>>(
    (acc, row) => {
      const key = row.phase ?? "Unassigned";
      acc[key] = acc[key] ? [...acc[key], row] : [row];
      return acc;
    },
    {}
  );

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician Mode
        </div>
        <h2 className="mt-2 text-4xl font-semibold">Today Board</h2>
        <p className="mt-2 text-base text-slate-300">
          Action-first view of active builds and the next task to touch.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <EmptyState
            title="No builds assigned today"
            description="When tasks are scheduled, they will appear here."
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([phase, builds]) => (
              <div key={phase} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-semibold text-slate-100">
                    {phase}
                  </div>
                  <div className="text-sm text-slate-400">
                    {builds.length} builds
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {builds.map((row) => {
                    const isBlocked =
                      row.status?.toUpperCase() === "HOLD" ||
                      row.task_status?.toUpperCase() === "BLOCKED";
                    return (
                      <Link
                        key={row.id}
                        href={`/floor/build/${row.code ?? row.id}`}
                        className={`min-w-[320px] rounded-3xl border bg-slate-900/40 p-6 transition ${
                          isBlocked
                            ? "border-rose-500/40"
                            : "border-slate-800 hover:border-brand-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-semibold text-slate-100">
                            {row.code ?? row.id}
                          </div>
                          <StatusBadge
                            label={row.status ?? "UNKNOWN"}
                            tone={statusTone(row.status)}
                          />
                        </div>
                        <div className="mt-2 text-lg text-slate-300">
                          {row.model ?? "Model TBD"}
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Next Task (within Work Package)
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-slate-100">
                            {row.task_name ?? "Review build status"}
                          </div>
                          <div className="mt-2 text-base text-slate-300">
                            Work Package: {row.phase ?? "Unassigned"}
                          </div>
                          <div className="mt-1 text-base text-slate-300">
                            Task Status: {row.task_status ?? "NOT_STARTED"}
                          </div>
                        </div>
                        {isBlocked ? (
                          <div className="mt-4 text-base font-semibold text-rose-200">
                            BLOCKED
                          </div>
                        ) : (
                          <div className="mt-4 text-base text-brand-200">
                            Open Build Station →
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

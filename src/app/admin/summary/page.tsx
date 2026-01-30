import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { safeQueryUnsafe } from "@/lib/db";

export const dynamic = "force-dynamic";

type MetricRow = {
  active_builds: number;
  hold_builds: number;
  blocked_tasks: number;
  shortages: number;
};

type BlockerRow = {
  reason: string | null;
  count: number;
};

type WipRow = {
  phase: string | null;
  count: number;
};

type TechnicianRow = {
  id: string;
  display_name: string;
  title: string | null;
  working: boolean;
  current_task: string | null;
  station: string | null;
  started_at: Date | string | null;
  hours_today: number | null;
};

export default async function AdminSummaryPage() {
  const [metricsRows, blockerRows, wipRows, technicianRows] =
    await Promise.all([
      safeQueryUnsafe<MetricRow[]>(
        `SELECT
           (SELECT COUNT(*) FROM builds WHERE status = 'IN_PROGRESS') AS active_builds,
           (SELECT COUNT(*) FROM builds WHERE status = 'HOLD') AS hold_builds,
           (SELECT COUNT(*) FROM tasks WHERE status = 'BLOCKED') AS blocked_tasks,
           (SELECT COUNT(*) FROM task_requirements tr
              LEFT JOIN inventory_balance ib ON ib.item_id = tr.item_id
              WHERE tr.required_qty > (COALESCE(ib.on_hand_qty, 0) - COALESCE(ib.allocated_qty, 0))
           ) AS shortages`,
        [],
        []
      ),
      safeQueryUnsafe<BlockerRow[]>(
        `SELECT COALESCE(block_event.note, 'Unspecified') AS reason,
                COUNT(*)::int AS count
         FROM tasks t
         LEFT JOIN LATERAL (
           SELECT note
           FROM task_events
           WHERE task_id = t.id AND event_type = 'BLOCK'
           ORDER BY occurred_at DESC
           LIMIT 1
         ) block_event ON true
         WHERE t.status = 'BLOCKED'
         GROUP BY block_event.note
         ORDER BY count DESC
         LIMIT 6`,
        [],
        []
      ),
      safeQueryUnsafe<WipRow[]>(
        `SELECT p.name AS phase, COUNT(*)::int AS count
         FROM tasks t
         LEFT JOIN phases p ON p.id = t.phase_id
         WHERE t.status IN ('IN_PROGRESS','PAUSED')
         GROUP BY p.name
         ORDER BY count DESC`,
        [],
        []
      ),
      safeQueryUnsafe<TechnicianRow[]>(
        `SELECT tech.id::text AS id,
                tech.display_name,
                tech.title,
                CASE WHEN ws.id IS NULL THEN false ELSE true END AS working,
                t.name AS current_task,
                p.name AS station,
                ws.started_at,
                COALESCE((
                  SELECT ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(ws2.ended_at, now()) - ws2.started_at))) / 3600, 2)
                  FROM work_sessions ws2
                  WHERE ws2.technician_id = tech.id
                    AND ws2.started_at::date = CURRENT_DATE
                ), 0) AS hours_today
         FROM technicians tech
         LEFT JOIN LATERAL (
           SELECT * FROM work_sessions
           WHERE technician_id = tech.id AND ended_at IS NULL
           ORDER BY started_at DESC
           LIMIT 1
         ) ws ON true
         LEFT JOIN tasks t ON t.id = ws.task_id
         LEFT JOIN phases p ON p.id = t.phase_id
         WHERE tech.active = true
         ORDER BY tech.display_name`,
        [],
        []
      )
    ]);

  const metrics = metricsRows[0];

  return (
    <section className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Admin
        </div>
        <h2 className="mt-2 text-3xl font-semibold">Summary</h2>
        <p className="mt-2 text-sm text-slate-400">
          Live operational health across builds, blockers, and technicians.
        </p>
      </div>

      {!metrics ? (
        <EmptyState
          title="No metrics available"
          description="Connect data to display summary metrics."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Active Builds" value={metrics.active_builds} />
          <MetricCard label="On-Hold Builds" value={metrics.hold_builds} />
          <MetricCard label="Blocked Tasks" value={metrics.blocked_tasks} />
          <MetricCard label="Shortages" value={metrics.shortages} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Top Blockers
          </div>
          {blockerRows.length === 0 ? (
            <EmptyState
              title="No blockers"
              description="Blocked tasks will appear here."
            />
          ) : (
            <div className="mt-3 space-y-3">
              {blockerRows.map((row) => (
                <div
                  key={row.reason ?? "reason"}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  <span>{row.reason ?? "Unspecified"}</span>
                  <StatusBadge label={`${row.count}`} tone="critical" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Station WIP
          </div>
          {wipRows.length === 0 ? (
            <EmptyState
              title="No WIP"
              description="Active tasks will show here."
            />
          ) : (
            <div className="mt-3 space-y-3">
              {wipRows.map((row) => (
                <div
                  key={row.phase ?? "phase"}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  <span>{row.phase ?? "Unassigned"}</span>
                  <StatusBadge label={`${row.count}`} tone="info" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technicians
        </div>
        {technicianRows.length === 0 ? (
          <EmptyState
            title="No technicians"
            description="Add technicians to show activity."
          />
        ) : (
          <div className="mt-3 space-y-3">
            {technicianRows.map((tech) => (
              <div
                key={tech.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <div>
                  <div className="font-semibold text-slate-100">
                    {tech.display_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tech.title ?? "Technician"}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Task: {tech.current_task ?? "Idle"}
                </div>
                <div className="text-xs text-slate-400">
                  Station: {tech.station ?? "—"}
                </div>
                <div className="text-xs text-slate-400">
                  Started:{" "}
                  {tech.started_at
                    ? new Date(tech.started_at).toLocaleTimeString()
                    : "—"}
                </div>
                <div className="text-xs text-slate-400">
                  Hours: {tech.hours_today ?? 0}
                </div>
                <StatusBadge
                  label={tech.working ? "Working" : "Idle"}
                  tone={tech.working ? "info" : "low"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

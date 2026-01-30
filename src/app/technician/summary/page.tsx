import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import TechnicianNowActions from "@/components/technician/TechnicianNowActions";
import { safeQueryUnsafe } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type NowRow = {
  session_id: string;
  task_id: string;
  task_name: string | null;
  build_code: string | null;
  phase: string | null;
  started_at: Date | string | null;
};

type NextTaskRow = {
  task_id: string;
  task_name: string | null;
  build_code: string | null;
  phase: string | null;
  status: string | null;
};

type TeamNowRow = {
  technician: string;
  task_name: string | null;
  build_code: string | null;
  phase: string | null;
  started_at: Date | string | null;
};

type BlockerRow = {
  task_id: string;
  task_name: string | null;
  build_code: string | null;
  reason: string | null;
};

export default async function TechnicianSummaryPage() {
  const techId = cookies().get("gw_tech_id")?.value ?? null;
  if (!techId) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Technician Mode
          </div>
          <h2 className="mt-2 text-4xl font-semibold">Summary</h2>
          <p className="mt-2 text-base text-slate-300">
            Select a technician to view your assignments.
          </p>
        </div>
        <EmptyState
          title="Technician not selected"
          description="Choose a technician from the sidebar to load your summary."
        />
      </section>
    );
  }

  const [nowRows, nextTasks, blockers] = await Promise.all([
    safeQueryUnsafe<NowRow[]>(
      `SELECT ws.id::text AS session_id,
              t.id::text AS task_id,
              t.name AS task_name,
              b.code AS build_code,
              p.name AS phase,
              ws.started_at
       FROM work_sessions ws
       JOIN tasks t ON t.id = ws.task_id
       JOIN builds b ON b.id = t.build_id
       LEFT JOIN phases p ON p.id = t.phase_id
       WHERE ws.technician_id = $1::bigint AND ws.ended_at IS NULL
       ORDER BY ws.started_at DESC
       LIMIT 1`,
      [techId],
      []
    ),
    safeQueryUnsafe<NextTaskRow[]>(
      `SELECT t.id::text AS task_id,
              t.name AS task_name,
              b.code AS build_code,
              p.name AS phase,
              t.status::text AS status
       FROM tasks t
       JOIN builds b ON b.id = t.build_id
       JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN phases p ON p.id = t.phase_id
       WHERE ta.technician_id = $1::bigint
         AND t.status IN ('NOT_STARTED','PAUSED')
       ORDER BY t.updated_at DESC NULLS LAST
       LIMIT 3`,
      [techId],
      []
    ),
    safeQueryUnsafe<BlockerRow[]>(
      `SELECT t.id::text AS task_id,
              t.name AS task_name,
              b.code AS build_code,
              block_event.note AS reason
       FROM tasks t
       JOIN builds b ON b.id = t.build_id
       JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN LATERAL (
         SELECT note
         FROM task_events
         WHERE task_id = t.id AND event_type = 'BLOCK'
         ORDER BY occurred_at DESC
         LIMIT 1
       ) block_event ON true
       WHERE ta.technician_id = $1::bigint
         AND t.status = 'BLOCKED'
       ORDER BY t.updated_at DESC NULLS LAST
       LIMIT 5`,
      [techId],
      []
    )
  ]);

  const now = nowRows[0];
  const phase = now?.phase ?? nextTasks[0]?.phase ?? null;

  const teamNow = phase
    ? await safeQueryUnsafe<TeamNowRow[]>(
        `SELECT tech.display_name AS technician,
                t.name AS task_name,
                b.code AS build_code,
                p.name AS phase,
                ws.started_at
         FROM work_sessions ws
         JOIN technicians tech ON tech.id = ws.technician_id
         JOIN tasks t ON t.id = ws.task_id
         JOIN builds b ON b.id = t.build_id
         LEFT JOIN phases p ON p.id = t.phase_id
         WHERE ws.ended_at IS NULL AND p.name = $1
         ORDER BY ws.started_at DESC
         LIMIT 6`,
        [phase],
        []
      )
    : [];

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician Mode
        </div>
        <h2 className="mt-2 text-4xl font-semibold">Summary</h2>
        <p className="mt-2 text-base text-slate-300">
          Your current work, next tasks, and blockers.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-6 pr-1">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            My NOW
          </div>
          {now ? (
            <>
              <div className="mt-3 text-2xl font-semibold text-slate-100">
                {now.task_name ?? "Task"}
              </div>
              <div className="mt-2 text-base text-slate-300">
                Build: {now.build_code ?? "—"} · {now.phase ?? "Unassigned"}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Started:{" "}
                {now.started_at
                  ? new Date(now.started_at).toLocaleString()
                  : "—"}
              </div>
              <TechnicianNowActions taskId={now.task_id} />
            </>
          ) : (
            <div className="mt-3 text-base text-slate-400">
              No active session. Start a task from Quick Log.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            My NEXT
          </div>
          {nextTasks.length === 0 ? (
            <div className="mt-3 text-base text-slate-400">
              No queued tasks assigned.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {nextTasks.map((task) => (
                <div
                  key={task.task_id}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-100">
                      {task.task_name ?? "Task"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {task.build_code ?? "—"} · {task.phase ?? "Unassigned"}
                    </div>
                  </div>
                  <StatusBadge
                    label={task.status ?? "NOT_STARTED"}
                    tone="info"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Team NOW
          </div>
          {teamNow.length === 0 ? (
            <div className="mt-3 text-base text-slate-400">
              No active team sessions for this work package.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {teamNow.map((row) => (
                <div
                  key={`${row.technician}-${row.task_name}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-100">
                      {row.technician}
                    </div>
                    <div className="text-xs text-slate-400">
                      {row.task_name ?? "Task"} · {row.build_code ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {row.started_at
                      ? new Date(row.started_at).toLocaleTimeString()
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            My Blockers
          </div>
          {blockers.length === 0 ? (
            <div className="mt-3 text-base text-slate-400">
              No blockers assigned to you.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {blockers.map((block) => (
                <div
                  key={block.task_id}
                  className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                >
                  <div className="font-semibold">
                    {block.task_name ?? "Task"} · {block.build_code ?? "—"}
                  </div>
                  <div className="text-xs">{block.reason ?? "Blocked"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

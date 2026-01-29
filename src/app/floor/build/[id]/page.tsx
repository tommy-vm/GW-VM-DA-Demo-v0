import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { safeQueryUnsafe } from "@/lib/db";
import { TechnicianTask } from "@/components/technician/TaskActionCard";
import BuildStationTabs from "@/components/technician/BuildStationTabs";
import PhaseTimeline from "@/components/PhaseTimeline";

export const dynamic = "force-dynamic";

type BuildRow = {
  id: string;
  code: string | null;
  model: string | null;
  status: string | null;
  eta: Date | string | null;
};

type TaskRow = {
  id: string;
  name: string | null;
  phase: string | null;
  status: string | null;
  updated_at: Date | string | null;
  block_reason: string | null;
  block_at: Date | string | null;
  started_at: Date | string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  occurred_at: Date | string | null;
  note: string | null;
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "BLOCKED" || normalized === "BLOCK") return "critical";
  if (normalized === "PAUSED") return "low";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default async function FloorBuildStation({
  params
}: {
  params: { id: string };
}) {
  const buildIdParam = params.id;

  const [builds] = await Promise.all([
    safeQueryUnsafe<BuildRow[]>(
      `SELECT id::text AS id,
              code,
              model,
              status::text AS status,
              eta_date AS eta
       FROM builds
       WHERE code = $1 OR id::text = $1
       LIMIT 1`,
      [buildIdParam],
      []
    )
  ]);

  const build = builds[0];
  const buildIdValue = build?.id;

  const [tasks, events, phases] = await Promise.all([
    buildIdValue
      ? safeQueryUnsafe<TaskRow[]>(
          `SELECT t.id::text AS id,
                  t.name,
                  p.name AS phase,
                  t.status::text AS status,
                  t.updated_at,
                  block_event.note AS block_reason,
                  block_event.occurred_at AS block_at,
                  t.started_at
           FROM tasks t
           LEFT JOIN phases p ON p.id = t.phase_id
           LEFT JOIN LATERAL (
             SELECT note, occurred_at
             FROM task_events
             WHERE task_id = t.id AND event_type = 'BLOCK'
             ORDER BY occurred_at DESC
             LIMIT 1
           ) block_event ON true
           WHERE t.build_id = $1::bigint
           ORDER BY t.updated_at DESC NULLS LAST
           LIMIT 100`,
          [buildIdValue],
          []
        )
      : Promise.resolve([]),
    buildIdValue
      ? safeQueryUnsafe<EventRow[]>(
          `SELECT te.id::text AS id,
                  te.event_type::text AS event_type,
                  te.occurred_at,
                  te.note
           FROM task_events te
           JOIN tasks t ON t.id = te.task_id
           WHERE t.build_id = $1::bigint
           ORDER BY te.occurred_at DESC NULLS LAST
           LIMIT 20`,
          [buildIdValue],
          []
        )
      : Promise.resolve([])
    ,
    safeQueryUnsafe<{ id: number; name: string; seq: number }[]>(
      `SELECT id, name, seq FROM phases ORDER BY seq ASC`,
      [],
      []
    )
  ]);

  const nextAction = tasks.find((task) =>
    ["IN_PROGRESS", "PAUSED", "BLOCKED", "NOT_STARTED"].includes(
      task.status ?? ""
    )
  );

  const phaseSummary = summarizePhase(tasks, phases, build?.eta ?? null);
  const phaseTimeline = buildPhaseTimeline(phases, tasks, build?.eta ?? null);

  const formattedTasks: TechnicianTask[] = tasks.map((task) => ({
    id: task.id,
    buildCode: build?.code ?? buildIdParam,
    title: task.name,
    phase: task.phase,
    status: task.status,
    blockReason: task.block_reason,
    blockAt: task.block_at ? new Date(task.block_at).toISOString() : null
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Build Station
          </div>
          <h2 className="mt-2 text-4xl font-semibold">
            {build?.code ?? buildIdParam}
          </h2>
          <div className="mt-2 text-lg text-slate-300">
            {build?.model ?? "Model TBD"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            label={build?.status ?? "UNKNOWN"}
            tone={statusTone(build?.status)}
          />
          <Link
            href="/floor"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Back to Today Board
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Current Work Package
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">
              {phaseSummary.name ?? "Unassigned"}
            </div>
            <div className="mt-2 text-base text-slate-300">
              Status: {phaseSummary.status}
            </div>
            <div className="mt-1 text-base text-slate-300">
              Started: {phaseSummary.startedAt ?? "—"}
            </div>
            <div className="mt-1 text-base text-slate-300">
              Target End: {phaseSummary.eta ?? "TBD"}
            </div>
          </div>
          <div className="min-w-[220px] space-y-2">
            <div className="text-sm text-slate-300">
              Progress: {phaseSummary.progressPct}%
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-brand-600"
                style={{ width: `${phaseSummary.progressPct}%` }}
              />
            </div>
            <div className="text-sm text-rose-200">
              Blockers: {phaseSummary.blockers}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Next Action
        </div>
        <div className="mt-3 text-3xl font-semibold text-slate-100">
          {nextAction?.name ?? "Review outstanding tasks"}
        </div>
        <div className="mt-2 text-lg text-slate-300">
          Phase: {nextAction?.phase ?? "Unassigned"}
        </div>
        <div className="mt-1 text-lg text-slate-300">
          Status: {nextAction?.status ?? "NOT_STARTED"}
        </div>
      </div>

      <PhaseTimeline items={phaseTimeline} />

      {formattedTasks.length === 0 ? (
        <EmptyState
          title="No tasks available"
          description="Create tasks to enable shop-floor actions."
        />
      ) : (
        <BuildStationTabs tasks={formattedTasks} />
      )}

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Latest Events
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Action buttons will log task events here."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="text-lg font-semibold text-slate-100">
                  {event.event_type ?? "EVENT"}
                </div>
                <div className="mt-2 text-base text-slate-300">
                  {event.note ?? "No notes"}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {event.occurred_at
                    ? new Date(event.occurred_at).toLocaleString()
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type PhaseTimelineItem = {
  name: string;
  status: "planned" | "active" | "hold" | "complete";
  eta?: string | null;
};

function buildPhaseTimeline(
  phases: { name: string }[],
  tasks: TaskRow[],
  eta: Date | string | null
): PhaseTimelineItem[] {
  const phasesWithTasks = phases.length
    ? phases
    : Array.from(new Set(tasks.map((task) => task.phase ?? "Unassigned"))).map(
        (name) => ({ name })
      );

  return phasesWithTasks.map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phase === phase.name);
    if (phaseTasks.length === 0) {
      return { name: phase.name, status: "planned", eta: null };
    }
    const completed = phaseTasks.filter((task) =>
      ["DONE", "COMPLETE"].includes(task.status?.toUpperCase() ?? "")
    ).length;
    const blocked = phaseTasks.filter(
      (task) => task.status?.toUpperCase() === "BLOCKED"
    ).length;
    const active = phaseTasks.some((task) =>
      ["IN_PROGRESS", "PAUSED"].includes(task.status?.toUpperCase() ?? "")
    );
    const status: PhaseTimelineItem["status"] =
      completed === phaseTasks.length
        ? "complete"
        : blocked > 0
        ? "hold"
        : active
        ? "active"
        : "planned";
    return {
      name: phase.name,
      status,
      eta: status === "active" && eta ? new Date(eta).toLocaleDateString() : null
    };
  });
}

type PhaseSummary = {
  name: string | null;
  status: "ACTIVE" | "HOLD" | "COMPLETE" | "PLANNED";
  startedAt: string | null;
  eta: string | null;
  progressPct: number;
  blockers: number;
};

function summarizePhase(
  tasks: TaskRow[],
  phases: { name: string }[],
  eta: Date | string | null
): PhaseSummary {
  const activeTask =
    tasks.find((task) =>
      ["IN_PROGRESS", "PAUSED", "BLOCKED"].includes(
        task.status?.toUpperCase() ?? ""
      )
    ) ?? tasks[0];

  const phaseName =
    activeTask?.phase ?? phases[0]?.name ?? "Unassigned";
  const phaseTasks = tasks.filter((task) => task.phase === phaseName);
  const total = phaseTasks.length || 1;
  const completed = phaseTasks.filter((task) =>
    ["DONE", "COMPLETE"].includes(task.status?.toUpperCase() ?? "")
  ).length;
  const blockers = phaseTasks.filter(
    (task) => task.status?.toUpperCase() === "BLOCKED"
  ).length;
  const active = phaseTasks.some((task) =>
    ["IN_PROGRESS", "PAUSED"].includes(task.status?.toUpperCase() ?? "")
  );
  const status: PhaseSummary["status"] =
    completed === phaseTasks.length
      ? "COMPLETE"
      : blockers > 0
      ? "HOLD"
      : active
      ? "ACTIVE"
      : "PLANNED";
  const startedAt = phaseTasks
    .map((task) => task.started_at)
    .filter(Boolean)
    .sort()[0];

  return {
    name: phaseName,
    status,
    startedAt: startedAt ? new Date(startedAt as Date).toLocaleDateString() : null,
    eta: eta ? new Date(eta).toLocaleDateString() : null,
    progressPct: Math.round((completed / total) * 100),
    blockers
  };
}

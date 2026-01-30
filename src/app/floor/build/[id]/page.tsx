import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { safeQueryUnsafe } from "@/lib/db";
import { TechnicianTask } from "@/components/technician/TaskActionCard";
import BuildStationTabs from "@/components/technician/BuildStationTabs";
import PhaseTimeline from "@/components/PhaseTimeline";
import StageRequirementsPanel, {
  StageRequirementItem
} from "@/components/technician/StageRequirementsPanel";
import { cookies } from "next/headers";

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

type RequirementRow = {
  item_id: string;
  sku: string | null;
  name: string | null;
  item_type: "KIT" | "BAG" | "SKU" | "MATERIAL";
  part_id: string | null;
  required_qty: number | null;
  uom: string | null;
  criticality: string | null;
  on_hand: number | null;
  allocated: number | null;
  build_allocated: number | null;
};

type RequirementChildRow = {
  parent_item_id: string;
  item_id: string;
  sku: string | null;
  name: string | null;
  qty_per_parent: number | null;
  part_id: string | null;
};

type InstanceStatusRow = {
  part_id: string;
  status: string;
  count: number;
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
  const techId = cookies().get("gw_tech_id")?.value ?? null;
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
           JOIN task_assignments ta ON ta.task_id = t.id
           LEFT JOIN phases p ON p.id = t.phase_id
           LEFT JOIN LATERAL (
             SELECT note, occurred_at
             FROM task_events
             WHERE task_id = t.id AND event_type = 'BLOCK'
             ORDER BY occurred_at DESC
             LIMIT 1
           ) block_event ON true
           WHERE t.build_id = $1::bigint
             AND ta.technician_id = $2::bigint
           ORDER BY t.updated_at DESC NULLS LAST
           LIMIT 100`,
          [buildIdValue, techId ?? "0"],
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
  const currentStage = phases.find((phase) => phase.name === phaseSummary.name);

  const requirements = nextAction
    ? await safeQueryUnsafe<RequirementRow[]>(
        `SELECT tr.item_id::text AS item_id,
                i.sku,
                i.name,
                i.item_type,
                i.part_id::text AS part_id,
                tr.required_qty::float8 AS required_qty,
                tr.uom,
                tr.criticality,
                COALESCE(ib.on_hand_qty, 0)::float8 AS on_hand,
                COALESCE(ib.allocated_qty, 0)::float8 AS allocated,
                COALESCE(alloc.qty_allocated, 0)::float8 AS build_allocated
         FROM task_requirements tr
         JOIN items i ON i.id = tr.item_id
         LEFT JOIN inventory_balance ib ON ib.item_id = tr.item_id
         LEFT JOIN (
           SELECT item_id, SUM(qty_allocated) AS qty_allocated
           FROM allocations
           WHERE build_id = $1::bigint AND stage_id = $2::bigint
           GROUP BY item_id
         ) alloc ON alloc.item_id = tr.item_id
         WHERE tr.task_id = $3::bigint`,
        [buildIdValue ?? 0, currentStage?.id ?? 0, nextAction?.id ?? 0],
        []
      )
    : [];

  const requirementChildren = requirements.length
    ? await safeQueryUnsafe<RequirementChildRow[]>(
        `SELECT bc.parent_item_id::text AS parent_item_id,
                c.id::text AS item_id,
                c.sku,
                c.name,
                bc.qty_per_parent::float8 AS qty_per_parent,
                c.part_id::text AS part_id
         FROM bom_components bc
         JOIN items c ON c.id = bc.child_item_id
         WHERE bc.parent_item_id = ANY($1::bigint[])`,
        [requirements.map((req) => req.item_id)],
        []
      )
    : [];

  const instanceStatuses = requirementChildren.length
    ? await safeQueryUnsafe<InstanceStatusRow[]>(
        `SELECT part_id::text AS part_id,
                status::text AS status,
                COUNT(*)::int AS count
         FROM part_instance
         WHERE part_id = ANY($1::bigint[])
         GROUP BY part_id, status`,
        [
          requirementChildren
            .map((child) => child.part_id)
            .filter(Boolean) as string[]
        ],
        []
      )
    : [];

  const taskShortages = tasks.length
    ? await safeQueryUnsafe<
        { task_id: string; sku: string | null; name: string | null }[]
      >(
        `SELECT tr.task_id::text AS task_id,
                i.sku,
                i.name
         FROM task_requirements tr
         JOIN items i ON i.id = tr.item_id
         LEFT JOIN inventory_balance ib ON ib.item_id = tr.item_id
         WHERE tr.task_id = ANY($1::bigint[])
           AND tr.required_qty > (COALESCE(ib.on_hand_qty, 0) - COALESCE(ib.allocated_qty, 0))`,
        [tasks.map((task) => task.id)],
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
    buildCode: build?.code ?? buildIdParam,
    title: task.name,
    phase: task.phase,
    status: task.status,
    blockReason: task.block_reason,
    blockAt: task.block_at ? new Date(task.block_at).toISOString() : null,
    shortageParts: shortageMap[task.id] ?? []
  }));

  const instanceStatusByPart = instanceStatuses.reduce<Record<string, string>>(
    (acc, row) => {
      const mapStatus = (status: string) => {
        if (["IN_REBUILD"].includes(status)) return "IN_REBUILD";
        if (["SCRAPPED"].includes(status)) return "SCRAP";
        return "READY_TO_INSTALL";
      };
      const priority = ["READY_TO_INSTALL", "IN_REBUILD", "SCRAP"];
      const current = acc[row.part_id];
      const next = mapStatus(row.status);
      if (!current) acc[row.part_id] = next;
      if (priority.indexOf(next) < priority.indexOf(current)) {
        acc[row.part_id] = next;
      }
      return acc;
    },
    {}
  );

  const childrenByParent = requirementChildren.reduce<
    Record<string, RequirementChildRow[]>
  >((acc, child) => {
    acc[child.parent_item_id] = acc[child.parent_item_id]
      ? [...acc[child.parent_item_id], child]
      : [child];
    return acc;
  }, {});

  const formattedRequirements: StageRequirementItem[] = requirements.map(
    (row) => {
      const available = (row.on_hand ?? 0) - (row.allocated ?? 0);
      const shortage = Math.max((row.required_qty ?? 0) - available, 0);
      const children =
        childrenByParent[row.item_id]?.map((child) => ({
          itemId: child.item_id,
          sku: child.sku,
          name: child.name,
          qtyPerParent: child.qty_per_parent ?? 1,
          instanceStatus: child.part_id
            ? instanceStatusByPart[child.part_id] ?? null
            : null
        })) ?? [];

      return {
        itemId: row.item_id,
        sku: row.sku,
        name: row.name,
        itemType: row.item_type,
        requiredQty: row.required_qty ?? 0,
        uom: row.uom,
        availableQty: available,
        shortageQty: shortage,
        criticality: row.criticality,
        children
      };
    }
  );

  if (!techId) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Build Station
          </div>
          <h2 className="mt-2 text-4xl font-semibold">
            {build?.code ?? buildIdParam}
          </h2>
        </div>
        <EmptyState
          title="Technician not selected"
          description="Choose a technician from the sidebar to view assigned tasks."
        />
      </section>
    );
  }

  return (
    <section className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_1fr] gap-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
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
          <div className="mt-3 space-y-2">
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

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Next Action
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">
            {nextAction?.name ?? "Review outstanding tasks"}
          </div>
          <div className="mt-2 text-lg text-slate-300">
            Work Package: {nextAction?.phase ?? "Unassigned"}
          </div>
          <div className="mt-1 text-lg text-slate-300">
            Status: {nextAction?.status ?? "NOT_STARTED"}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto space-y-6 pr-1">
        {formattedTasks.length === 0 ? (
          <EmptyState
            title="No tasks available"
            description="Create tasks to enable shop-floor actions."
          />
        ) : (
          <BuildStationTabs tasks={formattedTasks} />
        )}

        <StageRequirementsPanel
          title={phaseSummary.name ?? "Work Package"}
          buildId={buildIdValue ?? "0"}
          stageId={currentStage?.id ?? null}
          taskId={nextAction?.id ?? null}
          items={formattedRequirements}
        />

        <PhaseTimeline items={phaseTimeline} />

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

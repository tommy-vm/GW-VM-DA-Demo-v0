import Link from "next/link";
import { revalidatePath } from "next/cache";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { safeQueryUnsafe } from "@/lib/db";
import PhaseTimeline from "@/components/PhaseTimeline";

export const dynamic = "force-dynamic";

type BuildRow = {
  id: string;
  code: string | null;
  model: string | null;
  status: string | null;
  eta: Date | string | null;
  hold_reason: string | null;
  description: string | null;
};

type BomItem = {
  sku: string | null;
  name: string | null;
  required_qty: number | null;
  allocated_qty: number | null;
  consumed_qty: number | null;
};

type TaskRow = {
  id: string;
  name: string | null;
  phase: string | null;
  status: string | null;
  assignee: string | null;
  started_at: Date | string | null;
  updated_at: Date | string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  phase: string | null;
  note: string | null;
  status: string | null;
  created_at: Date | string | null;
};

type DocumentRow = {
  id: string;
  title: string | null;
  url: string | null;
  doc_type: string | null;
  created_at: Date | string | null;
};

type WorkOrderRow = {
  id: string;
  code: string | null;
  type: string | null;
  status: string | null;
  title: string | null;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "bom", label: "BOM" },
  { id: "tasks", label: "Tasks & Events" },
  { id: "documents", label: "Documents" },
  { id: "work-orders", label: "Work Orders" }
];

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

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "BLOCK") return "critical";
  if (normalized === "PAUSE") return "low";
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

function getCurrentFocusPhase(tasks: TaskRow[], events: EventRow[]) {
  const activeTask = tasks.find(
    (task) => task.status?.toUpperCase() === "IN_PROGRESS"
  );
  if (activeTask?.phase) return activeTask.phase;
  const activeEvent = events.find((event) =>
    ["IN_PROGRESS", "RESUME"].includes(event.event_type?.toUpperCase() ?? "")
  );
  return activeEvent?.phase ?? "Not started";
}

export default async function BuildDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const buildId = params.id;
  const activeTab = searchParams?.tab ?? "overview";

  const [builds] = await Promise.all([
    safeQueryUnsafe<BuildRow[]>(
      `SELECT
         id::text AS id,
         code,
         model,
         status::text AS status,
         eta_date AS eta,
         spec_json->>'hold_reason' AS hold_reason,
         spec_json->>'description' AS description
       FROM builds
       WHERE code = $1 OR id::text = $1
       LIMIT 1`,
      [buildId],
      []
    )
  ]);

  const build = builds[0];
  const buildIdValue = build?.id;

  const [bomItems, tasks, events, documents, workOrders, phases] = await Promise.all([
    buildIdValue
      ? safeQueryUnsafe<BomItem[]>(
          `SELECT pm.sku,
                  pm.name,
                  bbl.required_qty::float8 AS required_qty,
                  bbl.allocated_qty::float8 AS allocated_qty,
                  bbl.consumed_qty::float8 AS consumed_qty
           FROM build_bom_line bbl
           JOIN part_master pm ON pm.id = bbl.part_id
           WHERE bbl.build_id = $1::bigint`,
          [buildIdValue],
          []
        )
      : Promise.resolve([]),
    buildIdValue
      ? safeQueryUnsafe<TaskRow[]>(
          `SELECT t.id::text AS id,
                  t.name,
                  p.name AS phase,
                  t.status::text AS status,
                  t.owner AS assignee,
                  t.started_at,
                  t.updated_at
           FROM tasks t
           LEFT JOIN phases p ON p.id = t.phase_id
           WHERE t.build_id = $1::bigint
           ORDER BY t.updated_at DESC NULLS LAST
           LIMIT 200`,
          [buildIdValue],
          []
        )
      : Promise.resolve([]),
    buildIdValue
      ? safeQueryUnsafe<EventRow[]>(
          `SELECT te.id::text AS id,
                  te.event_type::text AS event_type,
                  p.name AS phase,
                  te.note,
                  te.event_type::text AS status,
                  te.occurred_at AS created_at
           FROM task_events te
           JOIN tasks t ON t.id = te.task_id
           LEFT JOIN phases p ON p.id = t.phase_id
           WHERE t.build_id = $1::bigint
           ORDER BY te.occurred_at DESC NULLS LAST
           LIMIT 200`,
          [buildIdValue],
          []
        )
      : Promise.resolve([]),
    buildIdValue
      ? safeQueryUnsafe<DocumentRow[]>(
          `SELECT
             id::text AS id,
             filename AS title,
             storage_url AS url,
             doc_type,
             uploaded_at AS created_at
           FROM build_documents
           WHERE build_id = $1::bigint
           ORDER BY uploaded_at DESC NULLS LAST`,
          [buildIdValue],
          []
        )
      : Promise.resolve([]),
    buildIdValue
      ? safeQueryUnsafe<WorkOrderRow[]>(
          `SELECT
             wo.id::text AS id,
             pm.sku AS code,
             wo.type::text AS type,
             wo.status::text AS status,
             pm.name AS title
           FROM work_orders wo
           JOIN part_master pm ON pm.id = wo.target_part_id
           WHERE wo.for_build_id = $1::bigint
           ORDER BY wo.created_at DESC NULLS LAST`,
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
  const focusPhase = getCurrentFocusPhase(tasks, events);
  const phaseTimeline = buildPhaseTimeline(phases, tasks, build?.eta ?? null);

  async function addDocument(formData: FormData) {
    "use server";
    const filename = formData.get("filename")?.toString().trim();
    const url = formData.get("url")?.toString().trim();
    const docType = formData.get("docType")?.toString().trim();
    if (!filename || !buildIdValue) return;

    try {
      await prisma.$executeRaw`
        INSERT INTO build_documents (build_id, filename, storage_url, doc_type)
        VALUES (${buildIdValue}::bigint, ${filename}, ${url || null}, ${
          docType || null
        })
      `;
    } catch (error) {
      console.warn("Document insert failed", error);
    }

    revalidatePath(`/builds/${buildId}`);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Build Detail
          </div>
          <h2 className="text-2xl font-semibold">
            {build?.code ?? buildId}
          </h2>
          <div className="mt-1 text-sm text-slate-400">
            {build?.model ?? "Model TBD"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            label={build?.status ?? "UNKNOWN"}
            tone={statusTone(build?.status)}
          />
          <div className="text-xs text-slate-400">
            Current Work Package:{" "}
            <span className="text-slate-200">{focusPhase}</span>
          </div>
        </div>
      </div>

      {build?.status?.toUpperCase() === "HOLD" ? (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
          <div className="font-semibold">Build on HOLD</div>
          <div className="mt-1 text-violet-100/80">
            {build?.hold_reason ??
              "Blocker: Engine bearing shortage for RS40 core rebuild."}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-b border-slate-800 pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/builds/${buildId}?tab=${tab.id}`}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wider ${
              activeTab === tab.id
                ? "border-brand-500/40 bg-brand-500/10 text-brand-100"
                : "border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs uppercase text-slate-500">Status</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">
              {build?.status ?? "UNKNOWN"}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              ETA:{" "}
              {build?.eta ? new Date(build.eta).toLocaleDateString() : "TBD"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs uppercase text-slate-500">
              Current Work Package
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-100">
              {focusPhase}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Derived from latest in-progress activity.
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs uppercase text-slate-500">Notes</div>
            <div className="mt-2 text-sm text-slate-300">
              {build?.description ?? "No notes captured yet."}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <PhaseTimeline items={phaseTimeline} />
      ) : null}

      {activeTab === "bom" ? (
        bomItems.length === 0 ? (
          <EmptyState
            title="No BOM items yet"
            description="BOM line items will appear once parts are allocated."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Part</th>
                  <th className="px-4 py-3">Required</th>
                  <th className="px-4 py-3">Allocated</th>
                  <th className="px-4 py-3">Consumed</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.map((item, index) => (
                  <tr
                    key={`${item.sku ?? "sku"}-${index}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {item.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{item.required_qty ?? 0}</td>
                    <td className="px-4 py-3">{item.allocated_qty ?? 0}</td>
                    <td className="px-4 py-3">{item.consumed_qty ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {activeTab === "tasks" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Tasks</h3>
            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks available"
                description="Tasks will populate as operations log progress."
              />
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100">
                        {task.name ?? "Task"}
                      </div>
                      <StatusBadge
                        label={task.status ?? "UNKNOWN"}
                        tone={statusTone(task.status)}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Work Package:{" "}
                      <span className="text-slate-200">{task.phase ?? "—"}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Updated:{" "}
                      {task.updated_at
                        ? new Date(task.updated_at).toLocaleString()
                        : "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Assignee: {task.assignee ?? "Unassigned"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Event Timeline</h3>
            {events.length === 0 ? (
              <EmptyState
                title="No event history yet"
                description="Phase hopping events will appear here."
              />
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-100">
                        {event.event_type ?? "EVENT"}
                      </div>
                      <StatusBadge
                        label={event.status ?? "LOGGED"}
                        tone={statusTone(event.status)}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Work Package:{" "}
                      <span className="text-slate-200">{event.phase ?? "—"}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {event.note ?? "No notes captured."}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Build Documents</h3>
            {documents.length === 0 ? (
              <EmptyState
                title="No documents yet"
                description="Add a build book entry to capture documents."
              />
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100">
                        {doc.title ?? "Untitled"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {doc.doc_type ?? "BUILD_BOOK"}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {doc.url ?? "No URL attached"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-lg font-semibold">Add Document</h3>
            <p className="mt-1 text-sm text-slate-400">
              Store metadata only. Actual PDFs are attached later.
            </p>
            <form action={addDocument} className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase text-slate-500">
                  Filename
                </label>
                <input
                  name="filename"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="build-book.pdf"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">URL</label>
                <input
                  name="url"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">
                  Document Type
                </label>
                <input
                  name="docType"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="BUILD_BOOK"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Add Document
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "work-orders" ? (
        workOrders.length === 0 ? (
          <EmptyState
            title="No work orders linked"
            description="Work orders will appear once created for this build."
          />
        ) : (
          <div className="space-y-3">
            {workOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-100">
                    {order.title ?? order.code ?? order.id}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Type: {order.type ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={order.status ?? "UNKNOWN"}
                    tone={statusTone(order.status)}
                  />
                  <Link
                    href={`/work-orders/${order.id}`}
                    className="text-xs text-brand-200 hover:text-brand-100"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

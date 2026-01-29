import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";

export const dynamic = "force-dynamic";

type WorkOrderRow = {
  id: string;
  code: string | null;
  type: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
};

type ConsumptionRow = {
  id: string;
  sku: string | null;
  name: string | null;
  qty: number | null;
  unit: string | null;
  consumed_at: Date | string | null;
};

type InspectionRow = {
  id: string;
  status: string | null;
  note: string | null;
  created_at: Date | string | null;
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default async function WorkOrderDetailPage({
  params
}: {
  params: { id: string };
}) {
  const workOrderId = params.id;
  const workOrderNumeric =
    Number.isFinite(Number(workOrderId)) ? Number(workOrderId) : null;

  const [workOrders, consumption, inspections] = await Promise.all([
    workOrderNumeric
      ? safeQueryUnsafe<WorkOrderRow[]>(
          `SELECT
             wo.id::text AS id,
             pm.sku AS code,
             wo.type::text AS type,
             wo.status::text AS status,
             pm.name AS title,
             wo.notes AS description
           FROM work_orders wo
           JOIN part_master pm ON pm.id = wo.target_part_id
           WHERE wo.id = $1
           LIMIT 1`,
          [workOrderNumeric],
          []
        )
      : Promise.resolve([]),
    workOrderNumeric
      ? safeQueryUnsafe<ConsumptionRow[]>(
          `SELECT wc.id::text AS id,
                  pm.sku,
                  pm.name,
                  wc.qty::float8 AS qty,
                  pm.uom AS unit,
                  wc.consumed_at
           FROM wo_consumption wc
           JOIN part_master pm ON pm.id = wc.part_id
           WHERE wc.work_order_id = $1
           ORDER BY wc.consumed_at DESC NULLS LAST`,
          [workOrderNumeric],
          []
        )
      : Promise.resolve([]),
    workOrderNumeric
      ? safeQueryUnsafe<InspectionRow[]>(
          `SELECT id::text AS id,
                  result AS status,
                  notes AS note,
                  created_at
           FROM inspection_records
           WHERE work_order_id = $1
           ORDER BY created_at DESC NULLS LAST`,
          [workOrderNumeric],
          []
        )
      : Promise.resolve([])
  ]);

  const workOrder = workOrders[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Work Order
          </div>
          <h2 className="text-2xl font-semibold">
            {workOrder?.title ?? workOrder?.code ?? workOrderId}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {workOrder?.description ?? "Engine rebuild and inspection workflow."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            label={workOrder?.status ?? "UNKNOWN"}
            tone={statusTone(workOrder?.status)}
          />
          <StatusBadge
            label={workOrder?.type ?? "REBUILD"}
            tone="info"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Material Consumption</h3>
          {consumption.length === 0 ? (
            <EmptyState
              title="No consumption records"
              description="Parts consumed for the rebuild will show here."
            />
          ) : (
            <div className="space-y-3">
              {consumption.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="font-semibold text-slate-100">
                    {row.sku ?? "—"}{" "}
                    <span className="text-sm text-slate-400">
                      {row.name ?? ""}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Qty: {row.qty ?? 0} {row.unit ?? ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.consumed_at
                      ? new Date(row.consumed_at).toLocaleString()
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Inspection Records</h3>
          {inspections.length === 0 ? (
            <EmptyState
              title="No inspection history"
              description="Inspection results appear after rebuild checks."
            />
          ) : (
            <div className="space-y-3">
              {inspections.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">
                        {row.status ?? "PENDING"}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    {row.note ?? "No notes recorded."}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
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

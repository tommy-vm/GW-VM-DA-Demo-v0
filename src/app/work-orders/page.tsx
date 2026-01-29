import Link from "next/link";
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
  build_code: string | null;
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default async function WorkOrdersPage() {
  const workOrders = await safeQueryUnsafe<WorkOrderRow[]>(
    `SELECT wo.id::text AS id,
            pm.sku AS code,
            wo.type::text AS type,
            wo.status::text AS status,
            pm.name AS title,
            b.code AS build_code
     FROM work_orders wo
     LEFT JOIN builds b ON b.id = wo.for_build_id
     JOIN part_master pm ON pm.id = wo.target_part_id
     ORDER BY wo.created_at DESC NULLS LAST
     LIMIT 100`,
    [],
    []
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Work Orders</h2>
        <p className="text-sm text-slate-400">
          Rebuild and fabrication work orders across the shop floor.
        </p>
      </div>

      {workOrders.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description="Work order data will appear when connected to Neon."
        />
      ) : (
        <div className="space-y-3">
          {workOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div>
                <div className="font-semibold text-slate-100">
                  {order.title ?? order.code ?? order.id}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Type: {order.type ?? "—"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Build: {order.build_code ?? "—"}
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
                  View Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

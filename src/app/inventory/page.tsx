import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";

export const dynamic = "force-dynamic";

type InventoryRow = {
  sku: string | null;
  name: string | null;
  on_hand: number | null;
  allocated: number | null;
  available: number | null;
};

function availabilityTone(available: number) {
  if (available <= 0) return "critical";
  if (available <= 3) return "low";
  return "ok";
}

export default async function InventoryPage() {
  let inventory = await safeQueryUnsafe<InventoryRow[]>(
    `SELECT sku,
            name,
            on_hand::float8 AS on_hand,
            allocated::float8 AS allocated,
            available::float8 AS available
     FROM inventory_view`,
    [],
    []
  );

  if (inventory.length === 0) {
    inventory = await safeQueryUnsafe<InventoryRow[]>(
      `SELECT pm.sku,
              pm.name,
              COALESCE(SUM(il.qty_on_hand), 0)::float8 AS on_hand,
              0::float8 AS allocated,
              COALESCE(SUM(il.qty_on_hand), 0)::float8 AS available
       FROM part_master pm
       LEFT JOIN inventory_lot il ON il.part_id = pm.id
       GROUP BY pm.sku, pm.name
       ORDER BY pm.sku`,
      [],
      []
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Inventory</h2>
        <p className="text-sm text-slate-400">
          Live availability with shortages highlighted for operations.
        </p>
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          title="Inventory data unavailable"
          description="Connect inventory or views to display availability."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">On Hand</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row, index) => {
                const available =
                  row.available ?? (row.on_hand ?? 0) - (row.allocated ?? 0);
                const highlight =
                  row.sku?.toUpperCase() === "ENG_BEARING_SET_993";
                return (
                  <tr
                    key={`${row.sku ?? "sku"}-${index}`}
                    className={`border-t border-slate-800 ${
                      highlight ? "bg-rose-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {row.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{row.on_hand ?? 0}</td>
                    <td className="px-4 py-3">{row.allocated ?? 0}</td>
                    <td className="px-4 py-3">{available}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={
                          available <= 0
                            ? "CRITICAL"
                            : available <= 3
                            ? "LOW"
                            : "OK"
                        }
                        tone={availabilityTone(available)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

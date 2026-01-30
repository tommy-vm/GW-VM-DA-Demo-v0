import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { safeQueryUnsafe } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  async function receiveStock(formData: FormData) {
    "use server";
    const sku = formData.get("sku")?.toString().trim();
    const qtyValue = formData.get("qty")?.toString().trim();
    const qty = qtyValue ? Number(qtyValue) : 0;
    if (!sku || !qty || Number.isNaN(qty)) return;

    try {
      await prisma.$executeRaw`
        INSERT INTO locations (name)
        VALUES ('Main Stock')
        ON CONFLICT (name) DO NOTHING
      `;

      const [loc] = (await prisma.$queryRaw`
        SELECT id FROM locations WHERE name = 'Main Stock' LIMIT 1
      `) as { id: number }[];

      const existing = (await prisma.$queryRaw`
        SELECT id FROM items WHERE sku = ${sku} LIMIT 1
      `) as { id: number }[];

      let itemId = existing[0]?.id;
      if (!itemId) {
        await prisma.$executeRaw`
          INSERT INTO items (sku, name, item_type, uom)
          VALUES (${sku}, ${sku}, 'SKU', 'EA')
          ON CONFLICT (sku) DO NOTHING
        `;
        const [created] = (await prisma.$queryRaw`
          SELECT id FROM items WHERE sku = ${sku} LIMIT 1
        `) as { id: number }[];
        itemId = created?.id;
      }

      if (!itemId || !loc?.id) return;

      await prisma.$executeRaw`
        INSERT INTO inventory_balance (item_id, location_id, on_hand_qty, allocated_qty)
        VALUES (${itemId}::bigint, ${loc.id}::bigint, ${qty}, 0)
        ON CONFLICT (item_id, location_id)
        DO UPDATE SET on_hand_qty = inventory_balance.on_hand_qty + ${qty}, updated_at = now()
      `;

      await prisma.$executeRaw`
        WITH shortage_tasks AS (
          SELECT tr.task_id,
                 MAX(CASE
                   WHEN tr.required_qty > (COALESCE(ib.on_hand_qty, 0) - COALESCE(ib.allocated_qty, 0))
                   THEN 1 ELSE 0 END) AS has_shortage
          FROM task_requirements tr
          LEFT JOIN inventory_balance ib ON ib.item_id = tr.item_id
          GROUP BY tr.task_id
        )
        UPDATE tasks t
        SET status = CASE
          WHEN st.has_shortage = 1 THEN 'BLOCKED'::task_status
          WHEN st.has_shortage = 0 AND t.status = 'BLOCKED'::task_status THEN 'IN_PROGRESS'::task_status
          ELSE t.status
        END,
        updated_at = now()
        FROM shortage_tasks st
        WHERE t.id = st.task_id
          AND t.status <> 'DONE'::task_status
      `;
    } catch (error) {
      console.warn("Receive stock failed", error);
    }

    revalidatePath("/inventory");
    revalidatePath("/floor/station");
    revalidatePath("/floor/log");
  }

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
    <section className="flex h-full min-h-0 flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Inventory</h2>
        <p className="text-sm text-slate-400">
          Live availability with shortages highlighted for operations.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <form action={receiveStock} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs uppercase text-slate-500">
              Receive SKU
            </label>
            <input
              name="sku"
              placeholder="ENG_BEARING_SET_993"
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="w-32">
            <label className="text-xs uppercase text-slate-500">Qty</label>
            <input
              name="qty"
              defaultValue="1"
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
          >
            Receive Stock
          </button>
        </form>
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          title="Inventory data unavailable"
          description="Connect inventory or views to display availability."
        />
      ) : (
        <div className="min-h-0 flex-1 rounded-xl border border-slate-800">
          <div className="h-full min-h-0 overflow-auto">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-400">
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
        </div>
      )}
    </section>
  );
}

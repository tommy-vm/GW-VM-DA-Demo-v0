import { safeQueryUnsafe } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import PartsFilters from "@/components/PartsFilters";

export const dynamic = "force-dynamic";

type PartRow = {
  id: string;
  sku: string | null;
  name: string | null;
  type: string | null;
  make_or_buy: string | null;
  serialized: boolean | null;
};

export default async function PartsPage({
  searchParams
}: {
  searchParams?: { q?: string; type?: string };
}) {
  const query = searchParams?.q?.trim() ?? "";
  const type = searchParams?.type?.trim() ?? "";
  const likeQuery = query ? `%${query}%` : null;
  const typeFilter = type || null;

  const parts = await safeQueryUnsafe<PartRow[]>(
    `SELECT id::text AS id,
            sku,
            name,
            type::text AS type,
            make_buy::text AS make_or_buy,
            is_serialized AS serialized
     FROM part_master
     WHERE ($1::text IS NULL OR sku ILIKE $1 OR name ILIKE $1)
       AND ($2::text IS NULL OR type::text = $2)
     ORDER BY sku
     LIMIT 200`,
    [likeQuery, typeFilter],
    []
  );

  return (
    <section className="flex h-full min-h-0 flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Parts Catalog</h2>
        <p className="text-sm text-slate-400">
          Search thousands of SKUs, fasteners, materials, and custom parts.
        </p>
      </div>

      <PartsFilters initialQuery={query} initialType={type} />

      {parts.length === 0 ? (
        <EmptyState
          title="No parts match the filters"
          description="Try a different SKU or remove filters."
        />
      ) : (
        <div className="min-h-0 flex-1 rounded-xl border border-slate-800">
          <div className="h-full min-h-0 overflow-auto">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Make/Buy</th>
                <th className="px-4 py-3">Serialized</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr
                  key={part.id}
                  className="border-t border-slate-800"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {part.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {part.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {part.type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {part.make_or_buy ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {part.serialized ? (
                      <StatusBadge label="YES" tone="info" />
                    ) : (
                      <StatusBadge label="NO" tone="low" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

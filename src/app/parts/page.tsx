import { safeQueryUnsafe } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

type PartRow = {
  id: string;
  sku: string | null;
  name: string | null;
  type: string | null;
  make_or_buy: string | null;
  serialized: boolean | null;
};

const typeOptions = [
  "COMPONENT",
  "SUBASSEMBLY",
  "FASTENER",
  "MATERIAL",
  "ASSEMBLY",
  "SERVICE"
];

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
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Parts Catalog</h2>
        <p className="text-sm text-slate-400">
          Search thousands of SKUs, fasteners, materials, and custom parts.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-xs uppercase text-slate-500">
            SKU or Name
          </label>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search parts..."
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Type</label>
          <select
            name="type"
            defaultValue={type}
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All Types</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Search
          </button>
        </div>
      </form>

      {parts.length === 0 ? (
        <EmptyState
          title="No parts match the filters"
          description="Try a different SKU or remove filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
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
      )}
    </section>
  );
}

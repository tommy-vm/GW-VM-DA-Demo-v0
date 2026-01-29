import Link from "next/link";
import { Prisma } from "@prisma/client";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { safeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

type BuildRow = {
  id: string;
  code: string | null;
  model: string | null;
  status: string | null;
  eta: Date | string | null;
  focus_phase: string | null;
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "HOLD") return "hold";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default async function BuildsPage() {
  const builds = await safeQuery<BuildRow[]>(
    Prisma.sql`
      WITH latest_tasks AS (
        SELECT
          t.build_id,
          p.name AS phase,
          ROW_NUMBER() OVER (
            PARTITION BY t.build_id
            ORDER BY t.updated_at DESC
          ) AS rn
        FROM tasks t
        LEFT JOIN phases p ON p.id = t.phase_id
        WHERE t.status = 'IN_PROGRESS'
      )
      SELECT
        b.id::text AS id,
        b.code,
        b.model,
        b.status::text AS status,
        b.eta_date AS eta,
        lt.phase AS focus_phase
      FROM builds b
      LEFT JOIN latest_tasks lt
        ON lt.build_id = b.id AND lt.rn = 1
      ORDER BY b.updated_at DESC NULLS LAST
      LIMIT 50
    `,
    []
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Builds</h2>
        <p className="text-sm text-slate-400">
          Active vehicle builds and their current work package focus.
        </p>
      </div>

      {builds.length === 0 ? (
        <EmptyState
          title="No builds found"
          description="Once Neon data is connected, builds will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Build</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">Current Work Package</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((build) => (
                <tr
                  key={build.id}
                  className="border-t border-slate-800 hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/builds/${build.code ?? build.id}`}
                      className="text-brand-200 hover:text-brand-100"
                    >
                      {build.code ?? build.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {build.model ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={build.status ?? "UNKNOWN"}
                      tone={statusTone(build.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {build.eta
                      ? new Date(build.eta).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {build.focus_phase ?? "Not started"}
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

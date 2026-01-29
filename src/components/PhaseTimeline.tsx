import StatusBadge from "@/components/StatusBadge";

type PhaseTimelineItem = {
  name: string;
  status: "planned" | "active" | "hold" | "complete";
  eta?: string | null;
};

const statusToneMap: Record<PhaseTimelineItem["status"], "info" | "hold" | "ok"> =
  {
    planned: "info",
    active: "info",
    hold: "hold",
    complete: "ok"
  };

export default function PhaseTimeline({ items }: { items: PhaseTimelineItem[] }) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        Phase Timeline
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div
            key={item.name}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              item.status === "active"
                ? "border-brand-500/40 bg-brand-500/10"
                : item.status === "hold"
                ? "border-rose-500/40 bg-rose-500/10"
                : "border-slate-800 bg-slate-950"
            }`}
          >
            <div className="text-sm font-semibold text-slate-100">
              {item.name}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400">
                ETA: {item.eta ?? "TBD"}
              </div>
              <StatusBadge
                label={item.status.toUpperCase()}
                tone={statusToneMap[item.status]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

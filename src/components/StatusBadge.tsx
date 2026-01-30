type Tone = "ok" | "low" | "critical" | "hold" | "info";

const toneStyles: Record<Tone, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  low: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  hold: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  info: "bg-slate-500/15 text-slate-200 border-slate-500/30"
};

export default function StatusBadge({
  label,
  tone = "info"
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}

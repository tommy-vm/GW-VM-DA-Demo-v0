export default function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-6 py-8 text-sm text-slate-400">
      <div className="text-base font-semibold text-slate-200">{title}</div>
      <div className="mt-2">{description}</div>
    </div>
  );
}

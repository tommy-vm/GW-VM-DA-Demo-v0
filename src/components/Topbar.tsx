export default function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4 backdrop-blur">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Production Demo
        </div>
        <h1 className="text-lg font-semibold text-slate-100">
          Agent-Assisted Manufacturing Intelligence OS
        </h1>
      </div>
      <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-300">
        Demo Admin Dashboard
      </div>
    </header>
  );
}

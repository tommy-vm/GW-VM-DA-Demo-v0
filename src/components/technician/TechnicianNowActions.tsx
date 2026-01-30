"use client";

import { postTaskEvent } from "@/components/technician/taskEvents";

export default function TechnicianNowActions({
  taskId
}: {
  taskId: string;
}) {
  const handle = async (eventType: string) => {
    try {
      await postTaskEvent({ taskId, eventType });
      window.location.reload();
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => handle("PAUSE")}
        className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base font-semibold text-slate-100"
      >
        Pause
      </button>
      <button
        type="button"
        onClick={() => handle("COMPLETE")}
        className="h-12 rounded-xl bg-brand-600 px-4 text-base font-semibold text-white"
      >
        Complete
      </button>
      <button
        type="button"
        onClick={() => handle("BLOCK")}
        className="h-12 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 text-base font-semibold text-rose-100"
      >
        Block
      </button>
    </div>
  );
}

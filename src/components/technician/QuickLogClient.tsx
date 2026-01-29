"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import TaskActionCard, {
  TechnicianTask
} from "@/components/technician/TaskActionCard";
import BlockModal from "@/components/technician/BlockModal";
import { postTaskEvent } from "@/components/technician/taskEvents";
import StatusBadge from "@/components/StatusBadge";

export default function QuickLogClient({ tasks }: { tasks: TechnicianTask[] }) {
  const [items, setItems] = useState(tasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState<"compact" | "cards">("compact");
  const [blockTarget, setBlockTarget] = useState<TechnicianTask | null>(null);

  const stages = Array.from(
    new Set(items.map((task) => task.phase).filter(Boolean))
  ) as string[];

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((task) => {
      if (stageFilter !== "all" && task.phase !== stageFilter) return false;
      if (statusFilter === "blocked" && task.status?.toUpperCase() !== "BLOCKED")
        return false;
      if (statusFilter === "completed") {
        const status = task.status?.toUpperCase();
        if (status !== "DONE" && status !== "COMPLETE") return false;
      }
      if (statusFilter === "active") {
        const status = task.status?.toUpperCase();
        if (status === "DONE" || status === "COMPLETE") return false;
      }
      if (query) {
        const haystack = [
          task.buildCode,
          task.title,
          task.phase
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, searchQuery, stageFilter, statusFilter]);

  const display = filtered.slice(0, 10);

  const handleOptimistic = (next: TechnicianTask) => {
    setItems((prev) =>
      prev.map((item) => (item.id === next.id ? next : item))
    );
  };

  const applyEvent = async (
    task: TechnicianTask,
    eventType: "START" | "RESUME" | "COMPLETE" | "BLOCK" | "UNBLOCK" | "PAUSE",
    note?: string | null
  ) => {
    const previous = { ...task };
    const nextStatus =
      eventType === "START" || eventType === "RESUME" || eventType === "UNBLOCK"
        ? "IN_PROGRESS"
        : eventType === "PAUSE"
        ? "PAUSED"
        : eventType === "COMPLETE"
        ? "DONE"
        : eventType === "BLOCK"
        ? "BLOCKED"
        : task.status ?? "NOT_STARTED";

    handleOptimistic({
      ...task,
      status: nextStatus,
      blockReason:
        eventType === "BLOCK"
          ? note ?? task.blockReason
          : eventType === "UNBLOCK"
          ? null
          : task.blockReason,
      blockAt:
        eventType === "BLOCK"
          ? new Date().toISOString()
          : eventType === "UNBLOCK"
          ? null
          : task.blockAt
    });

    try {
      await postTaskEvent({ taskId: task.id, eventType, note: note ?? null });
    } catch (error) {
      console.warn(error);
      handleOptimistic(previous);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Search build / task
          </label>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search build or task..."
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-lg text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStageFilter("all")}
            className={`rounded-full px-4 py-2 text-sm uppercase tracking-[0.2em] ${
              stageFilter === "all"
                ? "bg-brand-600 text-white"
                : "border border-slate-800 text-slate-400"
            }`}
          >
            All Stages
          </button>
          {stages.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`rounded-full px-4 py-2 text-sm uppercase tracking-[0.2em] ${
                stageFilter === stage
                  ? "bg-brand-600 text-white"
                  : "border border-slate-800 text-slate-400"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-full border border-slate-800">
            {[
              { id: "active", label: "Active" },
              { id: "blocked", label: "Blocked" },
              { id: "completed", label: "Completed" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-5 py-3 text-sm uppercase tracking-[0.2em] ${
                  statusFilter === tab.id
                    ? "bg-brand-600 text-white"
                    : "text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ml-auto inline-flex overflow-hidden rounded-full border border-slate-800">
            {[
              { id: "compact", label: "Compact" },
              { id: "cards", label: "Cards" }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id as "compact" | "cards")}
                className={`px-5 py-3 text-sm uppercase tracking-[0.2em] ${
                  viewMode === mode.id
                    ? "bg-brand-600 text-white"
                    : "text-slate-400"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {display.length === 0 ? (
        <EmptyState
          title="No tasks match filters"
          description="Try another build, stage, or status."
        />
      ) : (
        <div className={viewMode === "cards" ? "grid gap-6 lg:grid-cols-2" : "space-y-3"}>
          {display.map((task) =>
            viewMode === "cards" ? (
              <TaskActionCard
                key={task.id}
                task={task}
                onOptimisticUpdate={handleOptimistic}
              />
            ) : (
              <CompactRow
                key={task.id}
                task={task}
                onNextAction={(eventType) => applyEvent(task, eventType)}
                onBlock={() => setBlockTarget(task)}
                onPause={() => applyEvent(task, "PAUSE")}
              />
            )
          )}
        </div>
      )}

      <BlockModal
        isOpen={Boolean(blockTarget)}
        isBlocked={Boolean(blockTarget?.status?.toUpperCase() === "BLOCKED")}
        initialReason={blockTarget?.blockReason ?? null}
        onClose={() => setBlockTarget(null)}
        onConfirmBlock={async (reason, note) => {
          if (!blockTarget) return;
          const noteValue = note ? `${reason} — ${note}` : reason;
          await applyEvent(blockTarget, "BLOCK", noteValue);
          setBlockTarget(null);
        }}
        onResolve={
          blockTarget?.status?.toUpperCase() === "BLOCKED"
            ? async (note) => {
                if (!blockTarget) return;
                await applyEvent(blockTarget, "UNBLOCK", note || null);
                setBlockTarget(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function CompactRow({
  task,
  onNextAction,
  onBlock,
  onPause
}: {
  task: TechnicianTask;
  onNextAction: (eventType: "START" | "RESUME" | "COMPLETE" | "UNBLOCK") => void;
  onBlock: () => void;
  onPause: () => void;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const status = task.status?.toUpperCase() ?? "NOT_STARTED";
  const isBlocked = status === "BLOCKED";
  const nextAction =
    status === "NOT_STARTED"
      ? { label: "Start", event: "START" }
      : status === "IN_PROGRESS"
      ? { label: "Complete", event: "COMPLETE" }
      : status === "PAUSED"
      ? { label: "Resume", event: "RESUME" }
      : status === "BLOCKED"
      ? { label: "Resolve", event: "UNBLOCK" }
      : { label: "View", event: "COMPLETE" };

  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
        isBlocked ? "border-rose-500/50 bg-rose-500/10" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex-1">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {task.buildCode ?? "BUILD"} · {task.phase ?? "Work Package"}
        </div>
        <div className="mt-2 text-xl font-semibold text-slate-100">
          {task.title ?? "Task"}
        </div>
        {isBlocked && task.blockReason ? (
          <div className="mt-2 text-sm font-semibold text-rose-100">
            BLOCKED: {task.blockReason}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge label={task.status ?? "UNKNOWN"} tone={isBlocked ? "critical" : "info"} />
        <button
          type="button"
          onClick={() => onNextAction(nextAction.event)}
          className="h-12 rounded-xl bg-brand-600 px-5 text-base font-semibold text-white"
        >
          {nextAction.label}
        </button>
        <button
          type="button"
          onClick={onBlock}
          className="h-12 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 text-base font-semibold text-rose-100"
        >
          Block
        </button>
        {status === "IN_PROGRESS" ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base font-semibold text-slate-100"
            >
              More
            </button>
            {isMoreOpen ? (
              <div className="absolute right-0 top-[52px] z-10 w-40 rounded-xl border border-slate-800 bg-slate-950 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    onPause();
                  }}
                  className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-100"
                >
                  Pause
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

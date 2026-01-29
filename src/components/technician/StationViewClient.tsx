"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import BlockModal from "@/components/technician/BlockModal";
import { postTaskEvent } from "@/components/technician/taskEvents";

export type StationTask = {
  id: string;
  buildCode: string | null;
  model: string | null;
  title: string | null;
  phase: string | null;
  status: string | null;
  blockReason?: string | null;
  blockAt?: string | null;
};

const stations = [
  { id: "carbon", label: "Carbon", keywords: ["carbon", "composite"] },
  { id: "paint", label: "Paint", keywords: ["paint", "prep", "finish"] },
  { id: "assembly", label: "Assembly", keywords: ["assembly", "trim"] },
  { id: "powertrain", label: "Powertrain", keywords: ["power", "engine", "drivetrain"] },
  { id: "electrical", label: "Electrical", keywords: ["electrical", "wiring"] },
  { id: "qc", label: "QC", keywords: ["qc", "quality", "inspection"] },
  { id: "teardown", label: "Teardown", keywords: ["teardown", "strip"] }
];

function isBlocked(status?: string | null) {
  return status?.toUpperCase() === "BLOCKED";
}

function matchStation(task: StationTask, stationId: string) {
  const station = stations.find((item) => item.id === stationId);
  if (!station) return false;
  const phase = task.phase?.toLowerCase() ?? "";
  return station.keywords.some((keyword) => phase.includes(keyword));
}

function statusForEvent(eventType: string) {
  switch (eventType) {
    case "COMPLETE":
      return "DONE";
    case "BLOCK":
      return "BLOCKED";
    case "UNBLOCK":
      return "IN_PROGRESS";
    default:
      return "IN_PROGRESS";
  }
}

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "PAUSED") return "low";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

export default function StationViewClient({ tasks }: { tasks: StationTask[] }) {
  const [selectedStation, setSelectedStation] = useState(stations[0].id);
  const [items, setItems] = useState(tasks);
  const [blockTarget, setBlockTarget] = useState<StationTask | null>(null);

  const stationTasks = useMemo(
    () => items.filter((task) => matchStation(task, selectedStation)),
    [items, selectedStation]
  );

  const nowTasks = stationTasks.filter((task) =>
    ["IN_PROGRESS", "PAUSED"].includes(task.status?.toUpperCase() ?? "")
  );
  const nextTasks = stationTasks.filter(
    (task) => (task.status?.toUpperCase() ?? "") === "NOT_STARTED"
  );
  const blockedTasks = stationTasks.filter((task) => isBlocked(task.status));

  const applyEvent = async (
    task: StationTask,
    eventType: "COMPLETE" | "BLOCK" | "UNBLOCK",
    note?: string | null
  ) => {
    const previous = { ...task };
    const nextStatus = statusForEvent(eventType);

    setItems((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: nextStatus,
              blockReason: eventType === "BLOCK" ? note ?? item.blockReason : null,
              blockAt: eventType === "BLOCK" ? new Date().toISOString() : null
            }
          : item
      )
    );

    try {
      await postTaskEvent({
        taskId: task.id,
        eventType,
        note: note ?? null
      });
    } catch (error) {
      console.warn(error);
      setItems((prev) =>
        prev.map((item) => (item.id === previous.id ? previous : item))
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => setSelectedStation(station.id)}
            className={`h-14 rounded-2xl px-6 text-base font-semibold ${
              selectedStation === station.id
                ? "bg-brand-600 text-white"
                : "border border-slate-800 text-slate-300"
            }`}
          >
            {station.label}
          </button>
        ))}
      </div>

      <StationSection
        title="NOW"
        description="Tasks currently in progress at this station."
        tasks={nowTasks}
        onDone={(task) =>
          applyEvent(task, isBlocked(task.status) ? "UNBLOCK" : "COMPLETE")
        }
        onBlock={(task) => setBlockTarget(task)}
        onResolve={(task) => applyEvent(task, "UNBLOCK")}
        emphasized
      />
      <StationSection
        title="NEXT"
        description="Next tasks queued for this station."
        tasks={nextTasks}
        onDone={(task) =>
          applyEvent(task, isBlocked(task.status) ? "UNBLOCK" : "COMPLETE")
        }
        onBlock={(task) => setBlockTarget(task)}
      />
      <StationSection
        title="BLOCKED"
        description="Urgent blockers for this station."
        tasks={blockedTasks}
        onDone={(task) =>
          applyEvent(task, isBlocked(task.status) ? "UNBLOCK" : "COMPLETE")
        }
        onBlock={(task) => setBlockTarget(task)}
        onResolve={(task) => applyEvent(task, "UNBLOCK")}
        emphasized
      />

      <BlockModal
        isOpen={Boolean(blockTarget)}
        isBlocked={Boolean(blockTarget && isBlocked(blockTarget.status))}
        initialReason={blockTarget?.blockReason ?? null}
        onClose={() => setBlockTarget(null)}
        onConfirmBlock={async (reason, note) => {
          if (!blockTarget) return;
          const noteValue = note ? `${reason} — ${note}` : reason;
          await applyEvent(blockTarget, "BLOCK", noteValue);
          setBlockTarget(null);
        }}
        onResolve={
          blockTarget && isBlocked(blockTarget.status)
            ? async (note) => {
                await applyEvent(blockTarget, "UNBLOCK", note || null);
                setBlockTarget(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function StationSection({
  title,
  description,
  tasks,
  emphasized,
  onDone,
  onBlock,
  onResolve
}: {
  title: string;
  description: string;
  tasks: StationTask[];
  emphasized?: boolean;
  onDone: (task: StationTask) => void;
  onBlock: (task: StationTask) => void;
  onResolve?: (task: StationTask) => void;
}) {
  return (
    <div
      className={`space-y-4 rounded-3xl ${
        emphasized
          ? "border border-brand-500/30 bg-brand-500/5 p-4"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {title}
          </div>
          <div className="mt-2 text-lg text-slate-300">{description}</div>
        </div>
        <div className="text-sm text-slate-400">{tasks.length} tasks</div>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-6 text-base text-slate-500">
          No tasks in this queue.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const blocked = isBlocked(task.status);
            return (
              <div
                key={task.id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
                  blocked
                    ? "border-rose-500/50 bg-rose-500/10"
                    : emphasized
                    ? "border-brand-500/40 bg-slate-900/60"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {task.buildCode ?? "BUILD"} · {task.model ?? "Model TBD"}
                  </div>
                  <div className="text-2xl font-semibold text-slate-100">
                    {task.title ?? "Task"}
                  </div>
                  {blocked && task.blockReason ? (
                    <div className="text-base font-semibold text-rose-100">
                      BLOCKED: {task.blockReason}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={task.status ?? "UNKNOWN"}
                    tone={statusTone(task.status)}
                  />
                  <button
                    type="button"
                    onClick={() => onDone(task)}
                    className="h-12 rounded-xl bg-brand-600 px-5 text-base font-semibold text-white"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => onBlock(task)}
                    className="h-12 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 text-base font-semibold text-rose-100"
                  >
                    Block
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  shortageParts?: string[];
};

export type StationRequirement = {
  phase: string | null;
  sku: string | null;
  name: string | null;
  shortageQty: number;
};

const stations = [
  { id: "all", label: "All", keywords: [] },
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
  if (stationId === "all") return true;
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

export default function StationViewClient({
  tasks,
  requirements
}: {
  tasks: StationTask[];
  requirements: StationRequirement[];
}) {
  const [selectedStation, setSelectedStation] = useState(stations[0].id);
  const [items, setItems] = useState(tasks);
  const [blockTarget, setBlockTarget] = useState<StationTask | null>(null);

  const stationTasks = useMemo(
    () => items.filter((task) => matchStation(task, selectedStation)),
    [items, selectedStation]
  );

  const stationShortages = useMemo(() => {
    const shortageList = requirements
      .filter((req) => req.shortageQty > 0)
      .filter((req) => matchStation({ phase: req.phase } as StationTask, selectedStation))
      .sort((a, b) => b.shortageQty - a.shortageQty)
      .slice(0, 3);
    return shortageList;
  }, [requirements, selectedStation]);

  const blockedDueToParts = stationTasks.filter((task) =>
    (task.shortageParts ?? []).length > 0
  ).length;

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
    <div className="w-full space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
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
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Top Shortages
          </div>
          <div className="text-sm text-rose-200">
            Blocked due to parts/material: {blockedDueToParts}
          </div>
        </div>
        {stationShortages.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-400">
            Queue is empty.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {stationShortages.map((item) => (
              <div
                key={`${item.sku ?? item.name}-${item.phase}`}
                className="flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-base text-rose-100"
              >
                <div>
                  {item.sku ?? "SKU"} · {item.name ?? "Item"}
                </div>
                <div className="text-sm">Short: {item.shortageQty}</div>
              </div>
            ))}
          </div>
        )}
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
        accentClass="border-brand-600"
      />
      <StationSection
        title="NEXT"
        description="Next tasks queued for this station."
        tasks={nextTasks}
        onDone={(task) =>
          applyEvent(task, isBlocked(task.status) ? "UNBLOCK" : "COMPLETE")
        }
        onBlock={(task) => setBlockTarget(task)}
        accentClass="border-slate-400"
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
        accentClass="border-rose-500"
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
  accentClass,
  onDone,
  onBlock,
  onResolve
}: {
  title: string;
  description: string;
  tasks: StationTask[];
  accentClass: string;
  onDone: (task: StationTask) => void;
  onBlock: (task: StationTask) => void;
  onResolve?: (task: StationTask) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
      <div className={`border-l-4 pl-4 ${accentClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {title}
            </div>
            <div className="mt-2 text-lg text-slate-300">{description}</div>
          </div>
          <div className="text-sm text-slate-400">{tasks.length} tasks</div>
        </div>
      </div>
      {tasks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-400">
          No tasks queued.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tasks.map((task) => {
            const blocked = isBlocked(task.status) || (task.shortageParts ?? []).length > 0;
            return (
              <div
                key={task.id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
                  blocked
                    ? "border-rose-500/50 bg-rose-500/10"
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
                  {task.shortageParts && task.shortageParts.length > 0 ? (
                    <div className="text-base font-semibold text-rose-100">
                      BLOCKED: awaiting parts/material —{" "}
                      {task.shortageParts.join(", ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={blocked ? "BLOCKED" : task.status ?? "UNKNOWN"}
                    tone={statusTone(blocked ? "BLOCKED" : task.status)}
                  />
                  <button
                    type="button"
                    onClick={() => onDone(task)}
                    disabled={(task.shortageParts ?? []).length > 0}
                    className="h-11 rounded-xl bg-brand-600 px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => onBlock(task)}
                    className="h-11 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 text-base font-semibold text-rose-100"
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

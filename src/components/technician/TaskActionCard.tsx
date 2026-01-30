"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import BlockModal from "@/components/technician/BlockModal";
import { postTaskEvent } from "@/components/technician/taskEvents";

export type TechnicianTask = {
  id: string;
  buildCode: string | null;
  title: string | null;
  phase: string | null;
  status: string | null;
  blockReason?: string | null;
  blockAt?: string | null;
  shortageParts?: string[];
};

type NextAction = {
  label: string;
  actionType: "START" | "RESUME" | "COMPLETE" | "UNBLOCK" | "VIEW";
  secondary?: "PAUSE" | "BLOCK";
};

function statusTone(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "BLOCKED") return "critical";
  if (normalized === "PAUSED") return "low";
  if (normalized === "IN_PROGRESS") return "info";
  if (normalized === "DONE" || normalized === "COMPLETE") return "ok";
  return "info";
}

function getNextAction(task: TechnicianTask): NextAction {
  const status = task.status?.toUpperCase() ?? "NOT_STARTED";
  if (status === "NOT_STARTED") return { label: "Start", actionType: "START", secondary: "BLOCK" };
  if (status === "IN_PROGRESS") return { label: "Complete", actionType: "COMPLETE", secondary: "PAUSE" };
  if (status === "PAUSED") return { label: "Resume", actionType: "RESUME", secondary: "BLOCK" };
  if (status === "BLOCKED") return { label: "Resolve Block", actionType: "UNBLOCK", secondary: "BLOCK" };
  return { label: "View / Log Note", actionType: "VIEW" };
}

export default function TaskActionCard({
  task,
  onOptimisticUpdate
}: {
  task: TechnicianTask;
  onOptimisticUpdate: (next: TechnicianTask) => void;
}) {
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const nextAction = useMemo(() => getNextAction(task), [task]);
  const isShortage = (task.shortageParts ?? []).length > 0;
  const isBlocked =
    task.status?.toUpperCase() === "BLOCKED" || isShortage;
  const displayStatus = isBlocked ? "BLOCKED" : task.status ?? "UNKNOWN";

  const applyEvent = async (eventType: string, noteValue?: string | null) => {
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

    onOptimisticUpdate({
      ...task,
      status: nextStatus,
      blockReason:
        eventType === "BLOCK"
          ? noteValue ?? task.blockReason
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
      await postTaskEvent({
        taskId: task.id,
        eventType,
        note: noteValue ?? null
      });
    } catch (error) {
      onOptimisticUpdate(previous);
      console.warn(error);
    }
  };

  const handlePrimary = async () => {
    if (nextAction.actionType === "VIEW") return;
    await applyEvent(nextAction.actionType);
  };

  const handleSecondary = async () => {
    if (nextAction.secondary === "PAUSE") {
      setIsMoreOpen((prev) => !prev);
    } else if (nextAction.secondary === "BLOCK") {
      setIsBlockOpen(true);
    }
  };

  return (
    <div
      className={`rounded-3xl border bg-slate-900/40 p-6 ${
        isBlocked ? "border-rose-500/50 shadow-lg shadow-rose-500/10" : "border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
            {task.buildCode ?? "BUILD"}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            {task.title ?? "Task"}
          </div>
          <div className="mt-2 text-base text-slate-300">
            Stage: {task.phase ?? "Unassigned"}
          </div>
        </div>
        <StatusBadge label={displayStatus} tone={statusTone(displayStatus)} />
      </div>

      {isBlocked && task.blockReason ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-base text-rose-100">
          Blocked: {task.blockReason}
          {task.blockAt ? (
            <div className="mt-1 text-xs text-rose-200/70">
              {new Date(task.blockAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      ) : null}

      {isShortage ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-base text-rose-100">
          Blocked: awaiting parts/material —{" "}
          {task.shortageParts?.join(", ")}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handlePrimary}
          disabled={isShortage && nextAction.actionType !== "UNBLOCK"}
          className={`h-16 w-full rounded-2xl text-lg font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
            isBlocked
              ? "bg-rose-500 shadow-rose-500/30"
              : "bg-brand-600 shadow-brand-600/30"
          }`}
        >
          NEXT ACTION: {nextAction.label}
        </button>
        {nextAction.secondary ? (
          <div className="relative">
            <button
              type="button"
              onClick={handleSecondary}
              className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 text-base font-semibold text-slate-100"
            >
              {nextAction.secondary === "PAUSE"
                ? "More"
                : isBlocked
                ? "Block"
                : "Block"}
            </button>
            {nextAction.secondary === "PAUSE" && isMoreOpen ? (
              <div className="absolute left-0 right-0 top-[60px] z-10 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsMoreOpen(false);
                    await applyEvent("PAUSE");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 text-base font-semibold text-slate-100"
                >
                  Pause
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <BlockModal
        isOpen={isBlockOpen}
        isBlocked={isBlocked}
        initialReason={task.blockReason}
        onClose={() => setIsBlockOpen(false)}
        onConfirmBlock={async (reason, note) => {
          const noteValue = note ? `${reason} — ${note}` : reason;
          await applyEvent("BLOCK", noteValue);
          setIsBlockOpen(false);
        }}
        onResolve={
          isBlocked
            ? async (note) => {
                await applyEvent("UNBLOCK", note || null);
                setIsBlockOpen(false);
              }
            : undefined
        }
      />
    </div>
  );
}

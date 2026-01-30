"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { postTaskEvent } from "@/components/technician/taskEvents";

export type StageRequirementItem = {
  itemId: string;
  sku: string | null;
  name: string | null;
  itemType: "KIT" | "BAG" | "SKU" | "MATERIAL";
  requiredQty: number;
  uom: string | null;
  availableQty: number;
  shortageQty: number;
  criticality: string | null;
  children?: {
    itemId: string;
    sku: string | null;
    name: string | null;
    qtyPerParent: number;
    instanceStatus?: string | null;
  }[];
};

type Props = {
  title: string;
  buildId: string;
  stageId: number | null;
  taskId: string | null;
  items: StageRequirementItem[];
};

async function reserveItem(payload: {
  buildId: string;
  stageId: number;
  itemId: string;
  qty: number;
}) {
  const response = await fetch("/api/allocations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to reserve item");
  }
}

function getStatus(item: StageRequirementItem) {
  if (item.shortageQty > 0) return "SHORT";
  if (item.availableQty <= item.requiredQty * 1.2) return "LOW";
  return "OK";
}

function statusTone(status: string) {
  if (status === "SHORT") return "critical";
  if (status === "LOW") return "low";
  return "ok";
}

export default function StageRequirementsPanel({
  title,
  buildId,
  stageId,
  taskId,
  items
}: Props) {
  const [rows, setRows] = useState(items);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const displayItems =
    rows.filter((item) => ["KIT", "BAG"].includes(item.itemType)).length > 0
      ? rows.filter((item) => ["KIT", "BAG"].includes(item.itemType))
      : rows;
  const topShortages = useMemo(
    () =>
      rows
        .filter((item) => item.shortageQty > 0)
        .sort((a, b) => b.shortageQty - a.shortageQty)
        .slice(0, 3),
    [rows]
  );

  const handleReserve = async (item: StageRequirementItem) => {
    if (!stageId) return;
    const qty = Math.min(item.availableQty, item.requiredQty);
    if (qty <= 0) return;

    const previous = [...rows];
    setRows((prev) =>
      prev.map((row) =>
        row.itemId === item.itemId
          ? {
              ...row,
              availableQty: row.availableQty - qty,
              shortageQty: Math.max(row.requiredQty - (row.availableQty - qty), 0)
            }
          : row
      )
    );

    try {
      await reserveItem({
        buildId,
        stageId,
        itemId: item.itemId,
        qty
      });
    } catch (error) {
      console.warn(error);
      setRows(previous);
    }
  };

  const handleSuggestedBlock = async () => {
    if (!taskId || topShortages.length === 0) return;
    const summary = topShortages
      .map((item) => item.sku ?? item.name ?? "item")
      .join(", ");
    const note = `Awaiting parts/material — ${summary}`;
    try {
      await postTaskEvent({ taskId, eventType: "BLOCK", note });
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            This Stage Needs
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-100">
            {title}
          </div>
        </div>
        {topShortages.length > 0 ? (
          <button
            type="button"
            onClick={handleSuggestedBlock}
            className="h-10 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white"
          >
            Apply Suggested Block
          </button>
        ) : null}
      </div>

      {topShortages.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Suggested: Blocked — Awaiting parts/material (
          {topShortages
            .map((item) => item.sku ?? item.name ?? "item")
            .join(", ")}
          )
        </div>
      ) : null}

      {displayItems.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-4 text-sm text-slate-400">
          No requirements defined for this stage yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {displayItems.map((item) => {
            const status = getStatus(item);
            const isExpanded = expanded[item.itemId] ?? false;
            return (
              <div
                key={item.itemId}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
              >
                <div className="flex-1">
                  <div className="text-base font-semibold text-slate-100">
                    {item.sku ?? "SKU"} · {item.name ?? "Item"}{" "}
                    <span className="text-xs uppercase text-slate-500">
                      {item.itemType}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Required: {item.requiredQty} {item.uom ?? ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Available: {item.availableQty}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={status} tone={statusTone(status)} />
                  <button
                    type="button"
                    onClick={() => handleReserve(item)}
                    className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100"
                  >
                    Reserve
                  </button>
                  {item.children && item.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [item.itemId]: !isExpanded
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100"
                    >
                      {isExpanded ? "Hide" : "Expand"}
                    </button>
                  ) : null}
                </div>
                {item.children && item.children.length > 0 && isExpanded ? (
                  <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      SKU Breakdown
                    </div>
                    <div className="mt-2 space-y-2">
                      {item.children.map((child) => (
                        <div
                          key={child.itemId}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                        >
                          <div>
                            {child.sku ?? "SKU"} · {child.name ?? "Item"}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>Qty: {child.qtyPerParent}</span>
                            {child.instanceStatus ? (
                              <span>Instance: {child.instanceStatus}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

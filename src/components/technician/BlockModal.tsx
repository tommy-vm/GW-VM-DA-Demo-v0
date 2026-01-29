"use client";

import { useEffect, useState } from "react";
import { blockReasons } from "@/components/technician/blocking";

export default function BlockModal({
  isOpen,
  isBlocked,
  initialReason,
  onClose,
  onConfirmBlock,
  onResolve
}: {
  isOpen: boolean;
  isBlocked: boolean;
  initialReason?: string | null;
  onClose: () => void;
  onConfirmBlock: (reason: string, note: string) => void;
  onResolve?: (note: string) => void;
}) {
  const [selectedReason, setSelectedReason] = useState(
    initialReason ?? blockReasons[0]
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(initialReason ?? blockReasons[0]);
      setNote("");
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-4 pb-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Block Reason
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-100">
          {isBlocked ? "Resolve or Update Block" : "Mark Blocked"}
        </div>
        <div className="mt-4 grid gap-3">
          {blockReasons.map((reason) => (
            <label
              key={reason}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-base ${
                selectedReason === reason
                  ? "border-brand-500/60 bg-brand-500/10 text-brand-100"
                  : "border-slate-800 text-slate-300"
              }`}
            >
              <span>{reason}</span>
              <input
                type="radio"
                className="h-5 w-5"
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Optional Note
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-base text-slate-100"
            placeholder="Add a quick note..."
          />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onConfirmBlock(selectedReason, note)}
            className="h-14 w-full rounded-2xl bg-rose-500 text-base font-semibold text-white"
          >
            {isBlocked ? "Update Block" : "Mark Blocked"}
          </button>
          {isBlocked && onResolve ? (
            <button
              type="button"
              onClick={() => onResolve(note)}
              className="h-14 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-base font-semibold text-emerald-100"
            >
              Resolve Block
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-2xl border border-slate-700 text-base text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

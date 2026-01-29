"use client";

import { useEffect, useMemo, useState } from "react";
import FloorBuildClient from "@/components/technician/FloorBuildClient";
import { TechnicianTask } from "@/components/technician/TaskActionCard";
import {
  getInstructionTemplate,
  InstructionTemplate
} from "@/components/technician/instructions";

const tabs = ["Tasks", "Instructions", "Buildbook"] as const;

export default function BuildStationTabs({
  tasks
}: {
  tasks: TechnicianTask[];
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Tasks");
  const primaryTask = useMemo(
    () =>
      tasks.find((task) => task.status?.toUpperCase() === "IN_PROGRESS") ??
      tasks[0],
    [tasks]
  );
  const template: InstructionTemplate = useMemo(
    () => getInstructionTemplate(primaryTask?.title, primaryTask?.phase),
    [primaryTask]
  );
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialChecks = template.steps.reduce<Record<string, boolean>>(
      (acc, step) => {
        acc[step] = false;
        return acc;
      },
      {}
    );
    setChecks(initialChecks);
  }, [template]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 border-b border-slate-800 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wider ${
              activeTab === tab
                ? "border-brand-500/40 bg-brand-500/10 text-brand-100"
                : "border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Tasks" ? (
        <FloorBuildClient tasks={tasks} />
      ) : null}

      {activeTab === "Instructions" ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Work Instructions
          </div>
          <div className="mt-3 text-xl font-semibold text-slate-100">
            {template.taskTitle}
          </div>
          <div className="mt-2 text-base text-slate-300">
            Objective: {template.objective}
          </div>
          {template.prereqs ? (
            <div className="mt-3 text-base text-slate-300">
              Prereqs: {template.prereqs}
            </div>
          ) : null}
          {template.inputs ? (
            <div className="mt-3 text-base text-slate-300">
              Inputs: {template.inputs}
            </div>
          ) : null}
          <div className="mt-5 text-xs uppercase tracking-[0.3em] text-slate-500">
            Steps
          </div>
          <div className="mt-4 space-y-3">
            {Object.entries(checks).map(([label, value]) => (
              <label
                key={label}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-base text-slate-200"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() =>
                    setChecks((prev) => ({ ...prev, [label]: !value }))
                  }
                  className="h-5 w-5"
                />
              </label>
            ))}
          </div>
          {template.qualityGates?.length ? (
            <>
              <div className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
                Quality Gates
              </div>
              <ul className="mt-3 space-y-2 text-base text-slate-200">
                {template.qualityGates.map((gate) => (
                  <li key={gate} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2">
                    {gate}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {template.logOnCompletion?.length ? (
            <>
              <div className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
                Log on Completion
              </div>
              <ul className="mt-3 space-y-2 text-base text-slate-200">
                {template.logOnCompletion.map((log) => (
                  <li key={log} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2">
                    {log}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Buildbook" ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Buildbook
          </div>
          <div className="mt-3 text-xl font-semibold text-slate-100">
            Buildbook PDF (scanned)
          </div>
          <div className="mt-2 text-base text-slate-300">
            Placeholder for scanned buildbook artifacts.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="h-12 rounded-2xl bg-brand-600 px-5 text-base font-semibold text-white"
            >
              Open Buildbook
            </button>
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-700 bg-slate-950 px-5 text-base font-semibold text-slate-100"
            >
              Upload Placeholder
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

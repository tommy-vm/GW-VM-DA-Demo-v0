"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TechnicianSelector from "@/components/TechnicianSelector";

type Mode = "admin" | "technician";

const adminNav = [
  { href: "/admin/summary", label: "Summary" },
  { href: "/builds", label: "Builds" },
  { href: "/parts", label: "Parts" },
  { href: "/inventory", label: "Inventory" },
  { href: "/work-orders", label: "Work Orders" }
];

const techNav = [
  { href: "/floor/station", label: "Station" },
  { href: "/technician/summary", label: "Summary" },
  { href: "/floor", label: "Today Board" },
  { href: "/floor/log", label: "Quick Log" }
];

export default function Sidebar({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    const stored = window.localStorage.getItem("gw_mode") as Mode | null;
    if (stored && stored !== mode) {
      setMode(stored);
    }
  }, [mode]);

  const navItems = useMemo(
    () => (mode === "technician" ? techNav : adminNav),
    [mode]
  );

  const updateMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    window.localStorage.setItem("gw_mode", next);
    document.cookie = `gw_mode=${next}; path=/; max-age=31536000`;
    window.location.href = next === "technician" ? "/floor/station" : "/builds";
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        Gunther Werks
      </div>
      <div className="mt-2 text-lg font-semibold">Manufacturing OS</div>
      <div className="mt-4 flex w-full rounded-full border border-slate-800 bg-slate-900 p-1 text-xs">
        <button
          type="button"
          onClick={() => updateMode("admin")}
          className={`flex-1 rounded-full px-3 py-1.5 ${
            mode === "admin"
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Admin
        </button>
        <button
          type="button"
          onClick={() => updateMode("technician")}
          className={`flex-1 rounded-full px-3 py-1.5 ${
            mode === "technician"
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Technician
        </button>
      </div>
      <nav className="mt-10 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="sidebar-link rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {mode === "technician" ? <TechnicianSelector /> : null}
      <div className="mt-auto text-xs text-slate-500">
        &nbsp;
      </div>
    </aside>
  );
}

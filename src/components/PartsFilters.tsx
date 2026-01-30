"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const typeOptions = [
  "COMPONENT",
  "SUBASSEMBLY",
  "FASTENER",
  "MATERIAL",
  "ASSEMBLY",
  "SERVICE"
];

export default function PartsFilters({
  initialQuery,
  initialType
}: {
  initialQuery: string;
  initialType: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setQuery(initialQuery);
    setType(initialType);
  }, [initialQuery, initialType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      if (type) {
        params.set("type", type);
      } else {
        params.delete("type");
      }
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, type, pathname, router, searchParams]);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-3">
      <div className="md:col-span-2">
        <label className="text-xs uppercase text-slate-500">
          SKU or Name
        </label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search parts..."
          className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="text-xs uppercase text-slate-500">Type</label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All Types</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Technician = {
  id: string;
  display_name: string;
  title: string | null;
};

export default function TechnicianSelector() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("gw_tech_id");
    if (stored) {
      setSelected(stored);
    }
  }, []);

  useEffect(() => {
    fetch("/api/technicians")
      .then((res) => res.json())
      .then((data) => setTechnicians(data.technicians ?? []))
      .catch(() => setTechnicians([]));
  }, []);

  const handleChange = (value: string) => {
    setSelected(value);
    window.localStorage.setItem("gw_tech_id", value);
    document.cookie = `gw_tech_id=${value}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="mt-4">
      <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
        Technician
      </label>
      <select
        value={selected}
        onChange={(event) => handleChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
      >
        <option value="">Select technician</option>
        {technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.display_name}
            {tech.title ? ` — ${tech.title}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

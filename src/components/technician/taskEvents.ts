export async function postTaskEvent(payload: {
  taskId: string;
  eventType: string;
  note?: string | null;
}) {
  const technicianId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("gw_tech_id")
      : null;
  const response = await fetch("/api/task-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      technicianId
    })
  });
  if (!response.ok) {
    throw new Error("Failed to log task event");
  }
}

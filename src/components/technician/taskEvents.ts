export async function postTaskEvent(payload: {
  taskId: string;
  eventType: string;
  note?: string | null;
}) {
  const response = await fetch("/api/task-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to log task event");
  }
}

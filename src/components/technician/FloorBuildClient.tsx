"use client";

import { useState } from "react";
import TaskActionCard, {
  TechnicianTask
} from "@/components/technician/TaskActionCard";

export default function FloorBuildClient({
  tasks
}: {
  tasks: TechnicianTask[];
}) {
  const [items, setItems] = useState(tasks);

  const handleOptimistic = (next: TechnicianTask) => {
    setItems((prev) =>
      prev.map((item) => (item.id === next.id ? next : item))
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((task) => (
        <TaskActionCard
          key={task.id}
          task={task}
          onOptimisticUpdate={handleOptimistic}
        />
      ))}
    </div>
  );
}

-- Task-level requirements linking tasks to items

CREATE TABLE IF NOT EXISTS task_requirements (
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  required_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'EA',
  criticality TEXT NOT NULL DEFAULT 'STANDARD',
  PRIMARY KEY (task_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_task_requirements_task ON task_requirements(task_id);
CREATE INDEX IF NOT EXISTS idx_task_requirements_item ON task_requirements(item_id);

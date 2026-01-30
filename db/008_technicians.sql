-- Technician tracking

CREATE TABLE IF NOT EXISTS technicians (
  id BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  title TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignments (
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  technician_id BIGINT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'PRIMARY',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, technician_id)
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id BIGSERIAL PRIMARY KEY,
  technician_id BIGINT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  station_id BIGINT NULL REFERENCES phases(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_technician ON task_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_active ON work_sessions(technician_id, ended_at);

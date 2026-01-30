-- Seed technicians, assignments, and sessions

INSERT INTO technicians (display_name, title, active)
VALUES
  ('Liam Carter', 'Lead Tech', true),
  ('Ava Morales', 'Powertrain Specialist', true),
  ('Noah Patel', 'Carbon Specialist', true),
  ('Mia Chen', 'Paint Lead', true),
  ('Ethan Brooks', 'Electrical Tech', true),
  ('Sofia Rossi', 'QC Inspector', true),
  ('Olivia Park', 'Assembly Tech', true),
  ('Jackson Lee', 'Support Tech', true)
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, technician_id, role)
SELECT
  (SELECT id FROM tasks WHERE name ILIKE '%engine%rebuild%' LIMIT 1),
  (SELECT id FROM technicians WHERE display_name = 'Ava Morales' LIMIT 1),
  'PRIMARY'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%engine%rebuild%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Ava Morales')
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, technician_id, role)
SELECT
  (SELECT id FROM tasks WHERE name ILIKE '%carbon%' LIMIT 1),
  (SELECT id FROM technicians WHERE display_name = 'Noah Patel' LIMIT 1),
  'PRIMARY'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%carbon%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Noah Patel')
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, technician_id, role)
SELECT
  (SELECT id FROM tasks WHERE name ILIKE '%paint%' LIMIT 1),
  (SELECT id FROM technicians WHERE display_name = 'Mia Chen' LIMIT 1),
  'PRIMARY'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%paint%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Mia Chen')
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, technician_id, role)
SELECT
  (SELECT id FROM tasks WHERE name ILIKE '%ECU%' OR name ILIKE '%harness%' LIMIT 1),
  (SELECT id FROM technicians WHERE display_name = 'Ethan Brooks' LIMIT 1),
  'PRIMARY'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%ECU%' OR name ILIKE '%harness%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Ethan Brooks')
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, technician_id, role)
SELECT
  (SELECT id FROM tasks WHERE name ILIKE '%engine%rebuild%' LIMIT 1),
  (SELECT id FROM technicians WHERE display_name = 'Jackson Lee' LIMIT 1),
  'SUPPORT'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%engine%rebuild%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Jackson Lee')
ON CONFLICT DO NOTHING;

-- Open sessions for realism (two technicians working concurrently)
INSERT INTO work_sessions (technician_id, task_id, station_id, started_at, notes)
SELECT
  (SELECT id FROM technicians WHERE display_name = 'Ava Morales' LIMIT 1),
  (SELECT id FROM tasks WHERE name ILIKE '%engine%rebuild%' LIMIT 1),
  (SELECT phase_id FROM tasks WHERE name ILIKE '%engine%rebuild%' LIMIT 1),
  now() - interval '2 hours',
  'Powertrain coordination in progress'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%engine%rebuild%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Ava Morales')
ON CONFLICT DO NOTHING;

INSERT INTO work_sessions (technician_id, task_id, station_id, started_at, notes)
SELECT
  (SELECT id FROM technicians WHERE display_name = 'Noah Patel' LIMIT 1),
  (SELECT id FROM tasks WHERE name ILIKE '%carbon%' LIMIT 1),
  (SELECT phase_id FROM tasks WHERE name ILIKE '%carbon%' LIMIT 1),
  now() - interval '1 hour',
  'Carbon fitment in progress'
WHERE EXISTS (SELECT 1 FROM tasks WHERE name ILIKE '%carbon%')
  AND EXISTS (SELECT 1 FROM technicians WHERE display_name = 'Noah Patel')
ON CONFLICT DO NOTHING;

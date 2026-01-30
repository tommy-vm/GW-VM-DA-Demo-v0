-- Minimal tables for stage requirements and inventory visibility

CREATE TABLE IF NOT EXISTS stage_requirements (
  build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  stage_id BIGINT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES part_master(id) ON DELETE CASCADE,
  required_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'EA',
  criticality TEXT NOT NULL DEFAULT 'STANDARD',
  PRIMARY KEY (build_id, stage_id, item_id)
);

CREATE TABLE IF NOT EXISTS inventory_balance (
  item_id BIGINT NOT NULL REFERENCES part_master(id) ON DELETE CASCADE,
  location_id BIGINT NULL REFERENCES locations(id) ON DELETE SET NULL,
  on_hand_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  allocated_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, location_id)
);

CREATE TABLE IF NOT EXISTS allocations (
  id BIGSERIAL PRIMARY KEY,
  build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  stage_id BIGINT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES part_master(id) ON DELETE CASCADE,
  qty_allocated NUMERIC(12,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_req_build_stage ON stage_requirements(build_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_allocations_build_stage ON allocations(build_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_allocations_item ON allocations(item_id);

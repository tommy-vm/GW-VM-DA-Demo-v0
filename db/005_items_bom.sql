-- Items abstraction: KIT/BAG/SKU/MATERIAL + BOM components

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('KIT','BAG','SKU','MATERIAL')),
  part_id BIGINT NULL REFERENCES part_master(id) ON DELETE SET NULL,
  uom TEXT NOT NULL DEFAULT 'EA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_components (
  parent_item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  child_item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  qty_per_parent NUMERIC(12,4) NOT NULL DEFAULT 1,
  PRIMARY KEY (parent_item_id, child_item_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_parent ON bom_components(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_child ON bom_components(child_item_id);

ALTER TABLE stage_requirements
  DROP CONSTRAINT IF EXISTS stage_requirements_item_id_fkey;

ALTER TABLE stage_requirements
  ADD CONSTRAINT stage_requirements_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE inventory_balance
  DROP CONSTRAINT IF EXISTS inventory_balance_item_id_fkey;

ALTER TABLE inventory_balance
  ADD CONSTRAINT inventory_balance_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE allocations
  DROP CONSTRAINT IF EXISTS allocations_item_id_fkey;

ALTER TABLE allocations
  ADD CONSTRAINT allocations_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

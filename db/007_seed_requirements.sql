-- Seed demo items and task requirements

INSERT INTO locations (name)
VALUES ('Main Stock')
ON CONFLICT (name) DO NOTHING;

WITH loc AS (
  SELECT id FROM locations WHERE name = 'Main Stock' LIMIT 1
),
items_seed AS (
  SELECT * FROM (VALUES
    ('ENGINE_REBUILD_KIT_993', 'Engine Rebuild Kit 993', 'KIT'),
    ('BAG_FASTENERS_ENGINE_TOPEND', 'Fasteners Bag - Engine Top End', 'BAG'),
    ('ENG_BEARING_SET_993', 'Engine Bearing Set 993', 'SKU'),
    ('ENG_GASKET_KIT_993', 'Engine Gasket Kit 993', 'SKU'),
    ('ENG_OIL_10W60', 'Engine Oil 10W60', 'MATERIAL'),
    ('CARBON_PANEL_SET_993', 'Carbon Panel Set 993', 'KIT'),
    ('PAINT_MEXICO_BLUE', 'Paint - Mexico Blue', 'MATERIAL'),
    ('HARNESS_KIT_993', 'Harness Kit 993', 'KIT')
  ) AS t(sku, name, item_type)
)
INSERT INTO items (sku, name, item_type, part_id, uom)
SELECT i.sku, i.name, i.item_type,
       (SELECT id FROM part_master pm WHERE pm.sku = i.sku LIMIT 1),
       'EA'
FROM items_seed i
ON CONFLICT (sku) DO NOTHING;

-- BOM relationships
INSERT INTO bom_components (parent_item_id, child_item_id, qty_per_parent)
SELECT p.id, c.id, 1
FROM items p
JOIN items c ON c.sku IN ('ENG_BEARING_SET_993','ENG_GASKET_KIT_993')
WHERE p.sku = 'ENGINE_REBUILD_KIT_993'
ON CONFLICT DO NOTHING;

INSERT INTO bom_components (parent_item_id, child_item_id, qty_per_parent)
SELECT p.id, c.id, 6
FROM items p
JOIN items c ON c.sku = 'ENG_OIL_10W60'
WHERE p.sku = 'ENGINE_REBUILD_KIT_993'
ON CONFLICT DO NOTHING;

-- Inventory balance (bearing = 0 for shortage)
WITH loc AS (
  SELECT id FROM locations WHERE name = 'Main Stock' LIMIT 1
)
INSERT INTO inventory_balance (item_id, location_id, on_hand_qty, allocated_qty)
SELECT i.id, loc.id,
       CASE i.sku
         WHEN 'ENG_BEARING_SET_993' THEN 0
         WHEN 'ENG_GASKET_KIT_993' THEN 2
         WHEN 'ENG_OIL_10W60' THEN 12
         WHEN 'ENGINE_REBUILD_KIT_993' THEN 0
         WHEN 'BAG_FASTENERS_ENGINE_TOPEND' THEN 4
         WHEN 'CARBON_PANEL_SET_993' THEN 1
         WHEN 'PAINT_MEXICO_BLUE' THEN 0
         WHEN 'HARNESS_KIT_993' THEN 1
         ELSE 0
       END,
       0
FROM items i, loc
WHERE i.sku IN (
  'ENG_BEARING_SET_993',
  'ENG_GASKET_KIT_993',
  'ENG_OIL_10W60',
  'ENGINE_REBUILD_KIT_993',
  'BAG_FASTENERS_ENGINE_TOPEND',
  'CARBON_PANEL_SET_993',
  'PAINT_MEXICO_BLUE',
  'HARNESS_KIT_993'
)
ON CONFLICT (item_id, location_id) DO NOTHING;

-- Task requirements (match existing task names)
WITH engine_task AS (
  SELECT id FROM tasks WHERE name ILIKE '%engine%rebuild%' LIMIT 1
),
carbon_task AS (
  SELECT id FROM tasks WHERE name ILIKE '%carbon%' LIMIT 1
),
paint_task AS (
  SELECT id FROM tasks WHERE name ILIKE '%paint%' LIMIT 1
),
electrical_task AS (
  SELECT id FROM tasks WHERE name ILIKE '%ECU%' OR name ILIKE '%harness%' LIMIT 1
),
items_map AS (
  SELECT sku, id FROM items
)
INSERT INTO task_requirements (task_id, item_id, required_qty, uom, criticality)
SELECT t.id, i.id, 1, 'EA', 'CRITICAL'
FROM engine_task t
JOIN items_map i ON i.sku = 'ENGINE_REBUILD_KIT_993'
ON CONFLICT DO NOTHING;

INSERT INTO task_requirements (task_id, item_id, required_qty, uom, criticality)
SELECT t.id, i.id, 1, 'EA', 'STANDARD'
FROM carbon_task t
JOIN items_map i ON i.sku = 'CARBON_PANEL_SET_993'
ON CONFLICT DO NOTHING;

INSERT INTO task_requirements (task_id, item_id, required_qty, uom, criticality)
SELECT t.id, i.id, 1, 'EA', 'STANDARD'
FROM paint_task t
JOIN items_map i ON i.sku = 'PAINT_MEXICO_BLUE'
ON CONFLICT DO NOTHING;

INSERT INTO task_requirements (task_id, item_id, required_qty, uom, criticality)
SELECT t.id, i.id, 1, 'EA', 'STANDARD'
FROM electrical_task t
JOIN items_map i ON i.sku = 'HARNESS_KIT_993'
ON CONFLICT DO NOTHING;

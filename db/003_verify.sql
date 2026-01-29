-- Demo story verification queries

-- 1) Builds exist
SELECT code, status, model
FROM builds
WHERE code IN ('GW-993-SPD-09', 'GW-F26-08', 'GW-993-TRB-11');

-- 2) Turbo build is HOLD
SELECT code, status, spec_json->>'hold_reason' AS hold_reason
FROM builds
WHERE code = 'GW-993-TRB-11';

-- 3) Engine part instance exists and is IN_REBUILD or CORE
SELECT serial_no, status
FROM part_instance
WHERE serial_no = 'RS40-ENG-0011'
  AND status IN ('IN_REBUILD', 'CORE');

-- 4) Work orders include engine rebuild
SELECT wo.id, wo.type, wo.status, pm.sku, pm.name
FROM work_orders wo
JOIN part_master pm ON pm.id = wo.target_part_id
WHERE wo.type = 'REBUILD' OR pm.name ILIKE '%engine%';

-- 5) Bearing inventory shortage exists (0 on hand)
SELECT pm.sku,
       pm.name,
       COALESCE(SUM(il.qty_on_hand), 0) AS on_hand
FROM part_master pm
LEFT JOIN inventory_lot il ON il.part_id = pm.id
WHERE pm.sku = 'ENG_BEARING_SET_993'
GROUP BY pm.sku, pm.name;

-- 6) Task events include PAUSE / RESUME / BLOCK
SELECT te.event_type,
       te.occurred_at,
       t.id AS task_id
FROM task_events te
JOIN tasks t ON t.id = te.task_id
WHERE te.event_type IN ('PAUSE', 'RESUME', 'BLOCK')
ORDER BY te.occurred_at DESC
LIMIT 50;

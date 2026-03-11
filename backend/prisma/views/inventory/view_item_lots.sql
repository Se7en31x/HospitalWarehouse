SELECT
  l.id,
  l.lot_code,
  l.quantity,
  l.cost_price,
  l.status,
  l.note,
  l.expried_at,
  l.item_id,
  i.name AS item_name,
  i.code AS item_code,
  i.description AS item_description,
  i.image_url AS item_image,
  i.category_id,
  c.name AS category_name,
  i.unit_id,
  u.name AS unit_name,
  l.warehouse_id,
  w.name AS warehouse_name,
  w.location AS warehouse_location,
  l.supplier_id,
  s.name AS supplier_name,
  s.contact AS supplier_contact,
  s.phone AS supplier_phone,
  ((l.expried_at) :: date - CURRENT_DATE) AS days_until_expiry,
  ((l.quantity) :: numeric * l.cost_price) AS total_value,
  CASE
    WHEN (l.expried_at IS NULL) THEN 'NO_EXPIRY' :: text
    WHEN (l.expried_at < CURRENT_DATE) THEN 'EXPIRED' :: text
    WHEN (
      l.expried_at <= (CURRENT_DATE + '90 days' :: INTERVAL)
    ) THEN 'NEAR_EXPIRY' :: text
    ELSE 'NORMAL' :: text
  END AS expiry_status,
  l.created_at,
  l.updated_at,
  l.deleted_at,
  l.deleted_by
FROM
  (
    (
      (
        (
          (
            inventory.item_lots l
            LEFT JOIN inventory.items i ON ((l.item_id = i.id))
          )
          LEFT JOIN inventory.categories c ON ((i.category_id = c.id))
        )
        LEFT JOIN inventory.units u ON ((i.unit_id = u.id))
      )
      LEFT JOIN inventory.warehouses w ON ((l.warehouse_id = w.id))
    )
    LEFT JOIN supplier s ON ((l.supplier_id = s.id))
  )
WHERE
  (l.deleted_at IS NULL);
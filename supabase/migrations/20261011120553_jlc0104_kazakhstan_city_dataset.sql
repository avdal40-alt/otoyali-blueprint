BEGIN;

-- JLC-0104 / O-006: repository-versioned MVP city seed. The selected cities
-- are the three republican cities and the administrative centres for the 17
-- regions recorded by the Kazakhstan Bureau of National Statistics' 2026-01-01
-- administrative-territorial publication. This remains replaceable by a later
-- approved official/synchronised source without changing listing/search IDs.
INSERT INTO marketplace.cities (name, slug, country_code, sort_order, is_active)
VALUES
  ('Astana', 'kz-astana', 'KZ', 10, TRUE),
  ('Almaty', 'kz-almaty', 'KZ', 20, TRUE),
  ('Shymkent', 'kz-shymkent', 'KZ', 30, TRUE),
  ('Semey', 'kz-semey', 'KZ', 40, TRUE),
  ('Kokshetau', 'kz-kokshetau', 'KZ', 50, TRUE),
  ('Aktobe', 'kz-aktobe', 'KZ', 60, TRUE),
  ('Qonaev', 'kz-qonaev', 'KZ', 70, TRUE),
  ('Atyrau', 'kz-atyrau', 'KZ', 80, TRUE),
  ('Oral', 'kz-oral', 'KZ', 90, TRUE),
  ('Taraz', 'kz-taraz', 'KZ', 100, TRUE),
  ('Taldykorgan', 'kz-taldykorgan', 'KZ', 110, TRUE),
  ('Karaganda', 'kz-karaganda', 'KZ', 120, TRUE),
  ('Kostanay', 'kz-kostanay', 'KZ', 130, TRUE),
  ('Kyzylorda', 'kz-kyzylorda', 'KZ', 140, TRUE),
  ('Aktau', 'kz-aktau', 'KZ', 150, TRUE),
  ('Pavlodar', 'kz-pavlodar', 'KZ', 160, TRUE),
  ('Petropavl', 'kz-petropavl', 'KZ', 170, TRUE),
  ('Turkistan', 'kz-turkistan', 'KZ', 180, TRUE),
  ('Zhezkazgan', 'kz-zhezkazgan', 'KZ', 190, TRUE),
  ('Oskemen', 'kz-oskemen', 'KZ', 200, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    country_code = EXCLUDED.country_code,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;

COMMIT;

-- =============================================================================
-- OTOYALI - DATA-01 Turkey cities and vehicle catalog foundation
-- Migration: 20260706120000_data01_turkey_cities_vehicle_catalog.sql
-- Scope: additive city catalog and expanded vehicle make/model seeds
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Turkey city catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace.cities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  slug         TEXT        NOT NULL UNIQUE,
  country_code TEXT        NOT NULL DEFAULT 'TR',
  sort_order   INT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cities_name_not_empty_chk
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT cities_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  CONSTRAINT cities_country_code_chk
    CHECK (country_code ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE marketplace.cities IS
  'Active Turkey province catalog for marketplace filters and publishing.';

WITH city_seed(name, slug, sort_order) AS (
  VALUES
    ('Adana', 'adana', 1),
    ('Adıyaman', 'adiyaman', 2),
    ('Afyonkarahisar', 'afyonkarahisar', 3),
    ('Ağrı', 'agri', 4),
    ('Aksaray', 'aksaray', 5),
    ('Amasya', 'amasya', 6),
    ('Ankara', 'ankara', 7),
    ('Antalya', 'antalya', 8),
    ('Ardahan', 'ardahan', 9),
    ('Artvin', 'artvin', 10),
    ('Aydın', 'aydin', 11),
    ('Balıkesir', 'balikesir', 12),
    ('Bartın', 'bartin', 13),
    ('Batman', 'batman', 14),
    ('Bayburt', 'bayburt', 15),
    ('Bilecik', 'bilecik', 16),
    ('Bingöl', 'bingol', 17),
    ('Bitlis', 'bitlis', 18),
    ('Bolu', 'bolu', 19),
    ('Burdur', 'burdur', 20),
    ('Bursa', 'bursa', 21),
    ('Çanakkale', 'canakkale', 22),
    ('Çankırı', 'cankiri', 23),
    ('Çorum', 'corum', 24),
    ('Denizli', 'denizli', 25),
    ('Diyarbakır', 'diyarbakir', 26),
    ('Düzce', 'duzce', 27),
    ('Edirne', 'edirne', 28),
    ('Elazığ', 'elazig', 29),
    ('Erzincan', 'erzincan', 30),
    ('Erzurum', 'erzurum', 31),
    ('Eskişehir', 'eskisehir', 32),
    ('Gaziantep', 'gaziantep', 33),
    ('Giresun', 'giresun', 34),
    ('Gümüşhane', 'gumushane', 35),
    ('Hakkari', 'hakkari', 36),
    ('Hatay', 'hatay', 37),
    ('Iğdır', 'igdir', 38),
    ('Isparta', 'isparta', 39),
    ('İstanbul', 'istanbul', 40),
    ('İzmir', 'izmir', 41),
    ('Kahramanmaraş', 'kahramanmaras', 42),
    ('Karabük', 'karabuk', 43),
    ('Karaman', 'karaman', 44),
    ('Kars', 'kars', 45),
    ('Kastamonu', 'kastamonu', 46),
    ('Kayseri', 'kayseri', 47),
    ('Kırıkkale', 'kirikkale', 48),
    ('Kırklareli', 'kirklareli', 49),
    ('Kırşehir', 'kirsehir', 50),
    ('Kilis', 'kilis', 51),
    ('Kocaeli', 'kocaeli', 52),
    ('Konya', 'konya', 53),
    ('Kütahya', 'kutahya', 54),
    ('Malatya', 'malatya', 55),
    ('Manisa', 'manisa', 56),
    ('Mardin', 'mardin', 57),
    ('Mersin', 'mersin', 58),
    ('Muğla', 'mugla', 59),
    ('Muş', 'mus', 60),
    ('Nevşehir', 'nevsehir', 61),
    ('Niğde', 'nigde', 62),
    ('Ordu', 'ordu', 63),
    ('Osmaniye', 'osmaniye', 64),
    ('Rize', 'rize', 65),
    ('Sakarya', 'sakarya', 66),
    ('Samsun', 'samsun', 67),
    ('Siirt', 'siirt', 68),
    ('Sinop', 'sinop', 69),
    ('Sivas', 'sivas', 70),
    ('Şanlıurfa', 'sanliurfa', 71),
    ('Şırnak', 'sirnak', 72),
    ('Tekirdağ', 'tekirdag', 73),
    ('Tokat', 'tokat', 74),
    ('Trabzon', 'trabzon', 75),
    ('Tunceli', 'tunceli', 76),
    ('Uşak', 'usak', 77),
    ('Van', 'van', 78),
    ('Yalova', 'yalova', 79),
    ('Yozgat', 'yozgat', 80),
    ('Zonguldak', 'zonguldak', 81)
)
INSERT INTO marketplace.cities (name, slug, country_code, sort_order, is_active)
SELECT name, slug, 'TR', sort_order, TRUE
FROM city_seed
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  country_code = EXCLUDED.country_code,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

ALTER TABLE marketplace.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cities_select_active_public ON marketplace.cities;
CREATE POLICY cities_select_active_public
  ON marketplace.cities
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS cities_service_role_all ON marketplace.cities;
CREATE POLICY cities_service_role_all
  ON marketplace.cities
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON marketplace.cities TO anon, authenticated;
GRANT ALL ON marketplace.cities TO service_role;

CREATE OR REPLACE VIEW public.ff_cities
WITH (security_invoker = true)
AS
SELECT
  c.id AS city_id,
  c.name AS city_name,
  c.slug AS city_slug,
  c.country_code,
  c.sort_order
FROM marketplace.cities c
WHERE c.is_active = TRUE;

COMMENT ON VIEW public.ff_cities IS
  'Public-schema read view for active Turkey city catalog.';

GRANT SELECT ON public.ff_cities TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vehicle makes
-- ---------------------------------------------------------------------------

WITH make_seed(name, slug) AS (
  VALUES
    ('Abarth', 'abarth'),
    ('Acura', 'acura'),
    ('Alfa Romeo', 'alfa-romeo'),
    ('Aston Martin', 'aston-martin'),
    ('Audi', 'audi'),
    ('Bentley', 'bentley'),
    ('BMW', 'bmw'),
    ('BYD', 'byd'),
    ('Cadillac', 'cadillac'),
    ('Chery', 'chery'),
    ('Chevrolet', 'chevrolet'),
    ('Chrysler', 'chrysler'),
    ('Citroën', 'citroen'),
    ('Cupra', 'cupra'),
    ('Dacia', 'dacia'),
    ('Daewoo', 'daewoo'),
    ('Daihatsu', 'daihatsu'),
    ('Dodge', 'dodge'),
    ('DS Automobiles', 'ds-automobiles'),
    ('Ferrari', 'ferrari'),
    ('Fiat', 'fiat'),
    ('Ford', 'ford'),
    ('Geely', 'geely'),
    ('Genesis', 'genesis'),
    ('Honda', 'honda'),
    ('Hongqi', 'hongqi'),
    ('Hummer', 'hummer'),
    ('Hyundai', 'hyundai'),
    ('Infiniti', 'infiniti'),
    ('Isuzu', 'isuzu'),
    ('Iveco', 'iveco'),
    ('Jaguar', 'jaguar'),
    ('Jeep', 'jeep'),
    ('Kia', 'kia'),
    ('Lada', 'lada'),
    ('Lamborghini', 'lamborghini'),
    ('Lancia', 'lancia'),
    ('Land Rover', 'land-rover'),
    ('Leapmotor', 'leapmotor'),
    ('Lexus', 'lexus'),
    ('Lincoln', 'lincoln'),
    ('Lotus', 'lotus'),
    ('Maserati', 'maserati'),
    ('Mazda', 'mazda'),
    ('Mercedes-Benz', 'mercedes-benz'),
    ('MG', 'mg'),
    ('Mini', 'mini'),
    ('Mitsubishi', 'mitsubishi'),
    ('Nissan', 'nissan'),
    ('Opel', 'opel'),
    ('Peugeot', 'peugeot'),
    ('Polestar', 'polestar'),
    ('Porsche', 'porsche'),
    ('Proton', 'proton'),
    ('Ram', 'ram'),
    ('Renault', 'renault'),
    ('Rolls-Royce', 'rolls-royce'),
    ('Rover', 'rover'),
    ('Saab', 'saab'),
    ('Seat', 'seat'),
    ('Skoda', 'skoda'),
    ('Smart', 'smart'),
    ('SsangYong', 'ssangyong'),
    ('Subaru', 'subaru'),
    ('Suzuki', 'suzuki'),
    ('Tata', 'tata'),
    ('Tesla', 'tesla'),
    ('Tofaş', 'tofas'),
    ('Togg', 'togg'),
    ('Toyota', 'toyota'),
    ('Volkswagen', 'volkswagen'),
    ('Volvo', 'volvo'),
    ('Voyah', 'voyah'),
    ('Zeekr', 'zeekr'),
    ('Diğer', 'diger')
)
INSERT INTO vehicle.makes (name, slug, is_active)
SELECT name, slug, TRUE
FROM make_seed
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Vehicle models
-- ---------------------------------------------------------------------------

WITH model_seed(make_slug, name, slug) AS (
  VALUES
    ('abarth', '500', '500'), ('abarth', '595', '595'), ('abarth', '695', '695'), ('abarth', 'Diğer', 'diger'),
    ('acura', 'MDX', 'mdx'), ('acura', 'RDX', 'rdx'), ('acura', 'TLX', 'tlx'), ('acura', 'Integra', 'integra'), ('acura', 'Diğer', 'diger'),
    ('alfa-romeo', '147', '147'), ('alfa-romeo', '156', '156'), ('alfa-romeo', '159', '159'), ('alfa-romeo', 'Giulietta', 'giulietta'), ('alfa-romeo', 'Giulia', 'giulia'), ('alfa-romeo', 'Stelvio', 'stelvio'), ('alfa-romeo', 'Tonale', 'tonale'), ('alfa-romeo', 'MiTo', 'mito'), ('alfa-romeo', 'Diğer', 'diger'),
    ('aston-martin', 'DB9', 'db9'), ('aston-martin', 'DB11', 'db11'), ('aston-martin', 'DBS', 'dbs'), ('aston-martin', 'Vantage', 'vantage'), ('aston-martin', 'Rapide', 'rapide'), ('aston-martin', 'DBX', 'dbx'), ('aston-martin', 'Diğer', 'diger'),
    ('audi', 'A1', 'a1'), ('audi', 'A3', 'a3'), ('audi', 'A4', 'a4'), ('audi', 'A5', 'a5'), ('audi', 'A6', 'a6'), ('audi', 'A7', 'a7'), ('audi', 'A8', 'a8'), ('audi', 'Q2', 'q2'), ('audi', 'Q3', 'q3'), ('audi', 'Q5', 'q5'), ('audi', 'Q7', 'q7'), ('audi', 'Q8', 'q8'), ('audi', 'TT', 'tt'), ('audi', 'R8', 'r8'), ('audi', 'e-tron', 'e-tron'), ('audi', 'Q4 e-tron', 'q4-e-tron'), ('audi', 'Q8 e-tron', 'q8-e-tron'), ('audi', 'Diğer', 'diger'),
    ('bentley', 'Continental GT', 'continental-gt'), ('bentley', 'Flying Spur', 'flying-spur'), ('bentley', 'Bentayga', 'bentayga'), ('bentley', 'Mulsanne', 'mulsanne'), ('bentley', 'Diğer', 'diger'),
    ('bmw', '1 Series', '1-series'), ('bmw', '2 Series', '2-series'), ('bmw', '3 Series', '3-series'), ('bmw', '4 Series', '4-series'), ('bmw', '5 Series', '5-series'), ('bmw', '6 Series', '6-series'), ('bmw', '7 Series', '7-series'), ('bmw', '8 Series', '8-series'), ('bmw', 'X1', 'x1'), ('bmw', 'X2', 'x2'), ('bmw', 'X3', 'x3'), ('bmw', 'X4', 'x4'), ('bmw', 'X5', 'x5'), ('bmw', 'X6', 'x6'), ('bmw', 'X7', 'x7'), ('bmw', 'Z4', 'z4'), ('bmw', 'i3', 'i3'), ('bmw', 'i4', 'i4'), ('bmw', 'i5', 'i5'), ('bmw', 'i7', 'i7'), ('bmw', 'i8', 'i8'), ('bmw', 'iX', 'ix'), ('bmw', 'iX1', 'ix1'), ('bmw', 'iX3', 'ix3'), ('bmw', 'Diğer', 'diger'),
    ('byd', 'Atto 3', 'atto-3'), ('byd', 'Dolphin', 'dolphin'), ('byd', 'Seal', 'seal'), ('byd', 'Han', 'han'), ('byd', 'Tang', 'tang'), ('byd', 'Song Plus', 'song-plus'), ('byd', 'Yuan Plus', 'yuan-plus'), ('byd', 'Seagull', 'seagull'), ('byd', 'Diğer', 'diger'),
    ('cadillac', 'ATS', 'ats'), ('cadillac', 'CTS', 'cts'), ('cadillac', 'Escalade', 'escalade'), ('cadillac', 'SRX', 'srx'), ('cadillac', 'XT4', 'xt4'), ('cadillac', 'XT5', 'xt5'), ('cadillac', 'XT6', 'xt6'), ('cadillac', 'Diğer', 'diger'),
    ('chery', 'Tiggo 4 Pro', 'tiggo-4-pro'), ('chery', 'Tiggo 7 Pro', 'tiggo-7-pro'), ('chery', 'Tiggo 8 Pro', 'tiggo-8-pro'), ('chery', 'Omoda 5', 'omoda-5'), ('chery', 'Arrizo 5', 'arrizo-5'), ('chery', 'Arrizo 6', 'arrizo-6'), ('chery', 'Diğer', 'diger'),
    ('chevrolet', 'Aveo', 'aveo'), ('chevrolet', 'Cruze', 'cruze'), ('chevrolet', 'Captiva', 'captiva'), ('chevrolet', 'Spark', 'spark'), ('chevrolet', 'Lacetti', 'lacetti'), ('chevrolet', 'Epica', 'epica'), ('chevrolet', 'Malibu', 'malibu'), ('chevrolet', 'Camaro', 'camaro'), ('chevrolet', 'Corvette', 'corvette'), ('chevrolet', 'Tahoe', 'tahoe'), ('chevrolet', 'Trailblazer', 'trailblazer'), ('chevrolet', 'Diğer', 'diger'),
    ('chrysler', '300C', '300c'), ('chrysler', 'PT Cruiser', 'pt-cruiser'), ('chrysler', 'Voyager', 'voyager'), ('chrysler', 'Grand Voyager', 'grand-voyager'), ('chrysler', 'Sebring', 'sebring'), ('chrysler', 'Diğer', 'diger'),
    ('citroen', 'C1', 'c1'), ('citroen', 'C2', 'c2'), ('citroen', 'C3', 'c3'), ('citroen', 'C3 Aircross', 'c3-aircross'), ('citroen', 'C4', 'c4'), ('citroen', 'C4 X', 'c4-x'), ('citroen', 'C5', 'c5'), ('citroen', 'C5 Aircross', 'c5-aircross'), ('citroen', 'C-Elysee', 'c-elysee'), ('citroen', 'Berlingo', 'berlingo'), ('citroen', 'Jumpy', 'jumpy'), ('citroen', 'Jumper', 'jumper'), ('citroen', 'Ami', 'ami'), ('citroen', 'Diğer', 'diger'),
    ('cupra', 'Leon', 'leon'), ('cupra', 'Formentor', 'formentor'), ('cupra', 'Born', 'born'), ('cupra', 'Ateca', 'ateca'), ('cupra', 'Terramar', 'terramar'), ('cupra', 'Tavascan', 'tavascan'), ('cupra', 'Diğer', 'diger'),
    ('dacia', 'Sandero', 'sandero'), ('dacia', 'Sandero Stepway', 'sandero-stepway'), ('dacia', 'Logan', 'logan'), ('dacia', 'Logan MCV', 'logan-mcv'), ('dacia', 'Duster', 'duster'), ('dacia', 'Jogger', 'jogger'), ('dacia', 'Lodgy', 'lodgy'), ('dacia', 'Dokker', 'dokker'), ('dacia', 'Spring', 'spring'), ('dacia', 'Diğer', 'diger'),
    ('daewoo', 'Lanos', 'lanos'), ('daewoo', 'Matiz', 'matiz'), ('daewoo', 'Nexia', 'nexia'), ('daewoo', 'Nubira', 'nubira'), ('daewoo', 'Espero', 'espero'), ('daewoo', 'Diğer', 'diger'),
    ('daihatsu', 'Terios', 'terios'), ('daihatsu', 'Sirion', 'sirion'), ('daihatsu', 'Cuore', 'cuore'), ('daihatsu', 'Materia', 'materia'), ('daihatsu', 'Charade', 'charade'), ('daihatsu', 'Diğer', 'diger'),
    ('dodge', 'Avenger', 'avenger'), ('dodge', 'Caliber', 'caliber'), ('dodge', 'Challenger', 'challenger'), ('dodge', 'Charger', 'charger'), ('dodge', 'Durango', 'durango'), ('dodge', 'Journey', 'journey'), ('dodge', 'Nitro', 'nitro'), ('dodge', 'Ram', 'ram'), ('dodge', 'Diğer', 'diger'),
    ('ds-automobiles', 'DS 3', 'ds-3'), ('ds-automobiles', 'DS 4', 'ds-4'), ('ds-automobiles', 'DS 5', 'ds-5'), ('ds-automobiles', 'DS 7', 'ds-7'), ('ds-automobiles', 'DS 9', 'ds-9'), ('ds-automobiles', 'Diğer', 'diger'),
    ('ferrari', '458', '458'), ('ferrari', '488', '488'), ('ferrari', 'F8', 'f8'), ('ferrari', 'Roma', 'roma'), ('ferrari', 'Portofino', 'portofino'), ('ferrari', 'California', 'california'), ('ferrari', '812', '812'), ('ferrari', 'SF90', 'sf90'), ('ferrari', 'Purosangue', 'purosangue'), ('ferrari', 'Diğer', 'diger'),
    ('fiat', 'Albea', 'albea'), ('fiat', 'Bravo', 'bravo'), ('fiat', 'Brava', 'brava'), ('fiat', 'Doblo', 'doblo'), ('fiat', 'Egea', 'egea'), ('fiat', 'Fiorino', 'fiorino'), ('fiat', 'Linea', 'linea'), ('fiat', 'Marea', 'marea'), ('fiat', 'Panda', 'panda'), ('fiat', 'Punto', 'punto'), ('fiat', 'Tipo', 'tipo'), ('fiat', '500', '500'), ('fiat', '500L', '500l'), ('fiat', '500X', '500x'), ('fiat', 'Ducato', 'ducato'), ('fiat', 'Scudo', 'scudo'), ('fiat', 'Diğer', 'diger'),
    ('ford', 'B-Max', 'b-max'), ('ford', 'C-Max', 'c-max'), ('ford', 'Fiesta', 'fiesta'), ('ford', 'Focus', 'focus'), ('ford', 'Fusion', 'fusion'), ('ford', 'Mondeo', 'mondeo'), ('ford', 'Puma', 'puma'), ('ford', 'EcoSport', 'ecosport'), ('ford', 'Kuga', 'kuga'), ('ford', 'Edge', 'edge'), ('ford', 'Explorer', 'explorer'), ('ford', 'Mustang', 'mustang'), ('ford', 'Ranger', 'ranger'), ('ford', 'Transit', 'transit'), ('ford', 'Tourneo Courier', 'tourneo-courier'), ('ford', 'Tourneo Connect', 'tourneo-connect'), ('ford', 'Tourneo Custom', 'tourneo-custom'), ('ford', 'Diğer', 'diger'),
    ('geely', 'Coolray', 'coolray'), ('geely', 'Tugella', 'tugella'), ('geely', 'Emgrand', 'emgrand'), ('geely', 'Atlas', 'atlas'), ('geely', 'Geometry C', 'geometry-c'), ('geely', 'Diğer', 'diger'),
    ('genesis', 'G70', 'g70'), ('genesis', 'G80', 'g80'), ('genesis', 'G90', 'g90'), ('genesis', 'GV60', 'gv60'), ('genesis', 'GV70', 'gv70'), ('genesis', 'GV80', 'gv80'), ('genesis', 'Diğer', 'diger'),
    ('honda', 'Accord', 'accord'), ('honda', 'City', 'city'), ('honda', 'Civic', 'civic'), ('honda', 'CR-V', 'cr-v'), ('honda', 'CR-Z', 'cr-z'), ('honda', 'HR-V', 'hr-v'), ('honda', 'Jazz', 'jazz'), ('honda', 'Legend', 'legend'), ('honda', 'Prelude', 'prelude'), ('honda', 'S2000', 's2000'), ('honda', 'ZR-V', 'zr-v'), ('honda', 'e:NS1', 'e-ns1'), ('honda', 'Diğer', 'diger'),
    ('hongqi', 'E-HS9', 'e-hs9'), ('hongqi', 'H5', 'h5'), ('hongqi', 'H9', 'h9'), ('hongqi', 'HS5', 'hs5'), ('hongqi', 'Diğer', 'diger'),
    ('hummer', 'H2', 'h2'), ('hummer', 'H3', 'h3'), ('hummer', 'EV', 'ev'), ('hummer', 'Diğer', 'diger'),
    ('hyundai', 'Accent', 'accent'), ('hyundai', 'Accent Era', 'accent-era'), ('hyundai', 'Atos', 'atos'), ('hyundai', 'Bayon', 'bayon'), ('hyundai', 'Elantra', 'elantra'), ('hyundai', 'Getz', 'getz'), ('hyundai', 'i10', 'i10'), ('hyundai', 'i20', 'i20'), ('hyundai', 'i30', 'i30'), ('hyundai', 'Ioniq', 'ioniq'), ('hyundai', 'Ioniq 5', 'ioniq-5'), ('hyundai', 'Ioniq 6', 'ioniq-6'), ('hyundai', 'ix35', 'ix35'), ('hyundai', 'Kona', 'kona'), ('hyundai', 'Matrix', 'matrix'), ('hyundai', 'Santa Fe', 'santa-fe'), ('hyundai', 'Sonata', 'sonata'), ('hyundai', 'Staria', 'staria'), ('hyundai', 'Tucson', 'tucson'), ('hyundai', 'Veloster', 'veloster'), ('hyundai', 'Diğer', 'diger'),
    ('infiniti', 'EX', 'ex'), ('infiniti', 'FX', 'fx'), ('infiniti', 'G', 'g'), ('infiniti', 'M', 'm'), ('infiniti', 'Q30', 'q30'), ('infiniti', 'Q50', 'q50'), ('infiniti', 'Q60', 'q60'), ('infiniti', 'Q70', 'q70'), ('infiniti', 'QX30', 'qx30'), ('infiniti', 'QX50', 'qx50'), ('infiniti', 'QX60', 'qx60'), ('infiniti', 'QX70', 'qx70'), ('infiniti', 'QX80', 'qx80'), ('infiniti', 'Diğer', 'diger'),
    ('isuzu', 'D-Max', 'd-max'), ('isuzu', 'MU-X', 'mu-x'), ('isuzu', 'NPR', 'npr'), ('isuzu', 'NQR', 'nqr'), ('isuzu', 'Diğer', 'diger'),
    ('iveco', 'Daily', 'daily'), ('iveco', 'Eurocargo', 'eurocargo'), ('iveco', 'Stralis', 'stralis'), ('iveco', 'S-Way', 's-way'), ('iveco', 'Diğer', 'diger'),
    ('jaguar', 'E-Pace', 'e-pace'), ('jaguar', 'F-Pace', 'f-pace'), ('jaguar', 'F-Type', 'f-type'), ('jaguar', 'I-Pace', 'i-pace'), ('jaguar', 'XE', 'xe'), ('jaguar', 'XF', 'xf'), ('jaguar', 'XJ', 'xj'), ('jaguar', 'XK', 'xk'), ('jaguar', 'Diğer', 'diger'),
    ('jeep', 'Avenger', 'avenger'), ('jeep', 'Cherokee', 'cherokee'), ('jeep', 'Compass', 'compass'), ('jeep', 'Grand Cherokee', 'grand-cherokee'), ('jeep', 'Renegade', 'renegade'), ('jeep', 'Wrangler', 'wrangler'), ('jeep', 'Gladiator', 'gladiator'), ('jeep', 'Patriot', 'patriot'), ('jeep', 'Diğer', 'diger'),
    ('kia', 'Ceed', 'ceed'), ('kia', 'Cerato', 'cerato'), ('kia', 'EV3', 'ev3'), ('kia', 'EV6', 'ev6'), ('kia', 'EV9', 'ev9'), ('kia', 'Niro', 'niro'), ('kia', 'Optima', 'optima'), ('kia', 'Picanto', 'picanto'), ('kia', 'Rio', 'rio'), ('kia', 'Sorento', 'sorento'), ('kia', 'Soul', 'soul'), ('kia', 'Sportage', 'sportage'), ('kia', 'Stinger', 'stinger'), ('kia', 'Stonic', 'stonic'), ('kia', 'XCeed', 'xceed'), ('kia', 'Diğer', 'diger'),
    ('lada', 'Niva', 'niva'), ('lada', 'Samara', 'samara'), ('lada', 'Vega', 'vega'), ('lada', 'Kalina', 'kalina'), ('lada', 'Priora', 'priora'), ('lada', 'Vesta', 'vesta'), ('lada', 'Diğer', 'diger'),
    ('lamborghini', 'Aventador', 'aventador'), ('lamborghini', 'Huracan', 'huracan'), ('lamborghini', 'Urus', 'urus'), ('lamborghini', 'Gallardo', 'gallardo'), ('lamborghini', 'Revuelto', 'revuelto'), ('lamborghini', 'Diğer', 'diger'),
    ('lancia', 'Delta', 'delta'), ('lancia', 'Thema', 'thema'), ('lancia', 'Ypsilon', 'ypsilon'), ('lancia', 'Voyager', 'voyager'), ('lancia', 'Diğer', 'diger'),
    ('land-rover', 'Defender', 'defender'), ('land-rover', 'Discovery', 'discovery'), ('land-rover', 'Discovery Sport', 'discovery-sport'), ('land-rover', 'Freelander', 'freelander'), ('land-rover', 'Range Rover', 'range-rover'), ('land-rover', 'Range Rover Evoque', 'range-rover-evoque'), ('land-rover', 'Range Rover Sport', 'range-rover-sport'), ('land-rover', 'Range Rover Velar', 'range-rover-velar'), ('land-rover', 'Diğer', 'diger'),
    ('leapmotor', 'T03', 't03'), ('leapmotor', 'C10', 'c10'), ('leapmotor', 'C11', 'c11'), ('leapmotor', 'C01', 'c01'), ('leapmotor', 'Diğer', 'diger'),
    ('lexus', 'CT', 'ct'), ('lexus', 'ES', 'es'), ('lexus', 'GS', 'gs'), ('lexus', 'IS', 'is'), ('lexus', 'LC', 'lc'), ('lexus', 'LS', 'ls'), ('lexus', 'NX', 'nx'), ('lexus', 'RX', 'rx'), ('lexus', 'UX', 'ux'), ('lexus', 'LX', 'lx'), ('lexus', 'RZ', 'rz'), ('lexus', 'Diğer', 'diger'),
    ('lincoln', 'Aviator', 'aviator'), ('lincoln', 'Continental', 'continental'), ('lincoln', 'Corsair', 'corsair'), ('lincoln', 'MKC', 'mkc'), ('lincoln', 'MKX', 'mkx'), ('lincoln', 'Navigator', 'navigator'), ('lincoln', 'Nautilus', 'nautilus'), ('lincoln', 'Diğer', 'diger'),
    ('lotus', 'Elise', 'elise'), ('lotus', 'Exige', 'exige'), ('lotus', 'Evora', 'evora'), ('lotus', 'Emira', 'emira'), ('lotus', 'Eletre', 'eletre'), ('lotus', 'Diğer', 'diger'),
    ('maserati', 'Ghibli', 'ghibli'), ('maserati', 'Levante', 'levante'), ('maserati', 'Quattroporte', 'quattroporte'), ('maserati', 'GranTurismo', 'granturismo'), ('maserati', 'Grecale', 'grecale'), ('maserati', 'MC20', 'mc20'), ('maserati', 'Diğer', 'diger'),
    ('mazda', 'Mazda2', 'mazda2'), ('mazda', 'Mazda3', 'mazda3'), ('mazda', 'Mazda5', 'mazda5'), ('mazda', 'Mazda6', 'mazda6'), ('mazda', 'CX-3', 'cx-3'), ('mazda', 'CX-30', 'cx-30'), ('mazda', 'CX-5', 'cx-5'), ('mazda', 'CX-60', 'cx-60'), ('mazda', 'MX-5', 'mx-5'), ('mazda', 'RX-8', 'rx-8'), ('mazda', 'Diğer', 'diger'),
    ('mercedes-benz', 'A-Class', 'a-class'), ('mercedes-benz', 'B-Class', 'b-class'), ('mercedes-benz', 'C-Class', 'c-class'), ('mercedes-benz', 'E-Class', 'e-class'), ('mercedes-benz', 'S-Class', 's-class'), ('mercedes-benz', 'CLA', 'cla'), ('mercedes-benz', 'CLS', 'cls'), ('mercedes-benz', 'G-Class', 'g-class'), ('mercedes-benz', 'GLA', 'gla'), ('mercedes-benz', 'GLB', 'glb'), ('mercedes-benz', 'GLC', 'glc'), ('mercedes-benz', 'GLE', 'gle'), ('mercedes-benz', 'GLS', 'gls'), ('mercedes-benz', 'SL', 'sl'), ('mercedes-benz', 'SLK', 'slk'), ('mercedes-benz', 'SLC', 'slc'), ('mercedes-benz', 'Vito', 'vito'), ('mercedes-benz', 'V-Class', 'v-class'), ('mercedes-benz', 'Sprinter', 'sprinter'), ('mercedes-benz', 'EQA', 'eqa'), ('mercedes-benz', 'EQB', 'eqb'), ('mercedes-benz', 'EQC', 'eqc'), ('mercedes-benz', 'EQE', 'eqe'), ('mercedes-benz', 'EQS', 'eqs'), ('mercedes-benz', 'EQV', 'eqv'), ('mercedes-benz', 'Diğer', 'diger'),
    ('mg', 'ZS', 'zs'), ('mg', 'HS', 'hs'), ('mg', 'MG3', 'mg3'), ('mg', 'MG4', 'mg4'), ('mg', 'MG5', 'mg5'), ('mg', 'Marvel R', 'marvel-r'), ('mg', 'EHS', 'ehs'), ('mg', 'Cyberster', 'cyberster'), ('mg', 'Diğer', 'diger'),
    ('mini', 'Cooper', 'cooper'), ('mini', 'One', 'one'), ('mini', 'Clubman', 'clubman'), ('mini', 'Countryman', 'countryman'), ('mini', 'Paceman', 'paceman'), ('mini', 'Coupe', 'coupe'), ('mini', 'Roadster', 'roadster'), ('mini', 'Diğer', 'diger'),
    ('mitsubishi', 'ASX', 'asx'), ('mitsubishi', 'Attrage', 'attrage'), ('mitsubishi', 'Colt', 'colt'), ('mitsubishi', 'Eclipse Cross', 'eclipse-cross'), ('mitsubishi', 'Lancer', 'lancer'), ('mitsubishi', 'L200', 'l200'), ('mitsubishi', 'Outlander', 'outlander'), ('mitsubishi', 'Pajero', 'pajero'), ('mitsubishi', 'Space Star', 'space-star'), ('mitsubishi', 'Diğer', 'diger'),
    ('nissan', 'Almera', 'almera'), ('nissan', 'Juke', 'juke'), ('nissan', 'Micra', 'micra'), ('nissan', 'Navara', 'navara'), ('nissan', 'Note', 'note'), ('nissan', 'Pathfinder', 'pathfinder'), ('nissan', 'Primera', 'primera'), ('nissan', 'Qashqai', 'qashqai'), ('nissan', 'X-Trail', 'x-trail'), ('nissan', 'Leaf', 'leaf'), ('nissan', 'Ariya', 'ariya'), ('nissan', 'Diğer', 'diger'),
    ('opel', 'Adam', 'adam'), ('opel', 'Antara', 'antara'), ('opel', 'Astra', 'astra'), ('opel', 'Corsa', 'corsa'), ('opel', 'Crossland', 'crossland'), ('opel', 'Frontera', 'frontera'), ('opel', 'Grandland', 'grandland'), ('opel', 'Insignia', 'insignia'), ('opel', 'Meriva', 'meriva'), ('opel', 'Mokka', 'mokka'), ('opel', 'Omega', 'omega'), ('opel', 'Vectra', 'vectra'), ('opel', 'Zafira', 'zafira'), ('opel', 'Combo', 'combo'), ('opel', 'Vivaro', 'vivaro'), ('opel', 'Diğer', 'diger'),
    ('peugeot', '106', '106'), ('peugeot', '107', '107'), ('peugeot', '206', '206'), ('peugeot', '207', '207'), ('peugeot', '208', '208'), ('peugeot', '301', '301'), ('peugeot', '306', '306'), ('peugeot', '307', '307'), ('peugeot', '308', '308'), ('peugeot', '407', '407'), ('peugeot', '408', '408'), ('peugeot', '508', '508'), ('peugeot', '2008', '2008'), ('peugeot', '3008', '3008'), ('peugeot', '5008', '5008'), ('peugeot', 'Rifter', 'rifter'), ('peugeot', 'Partner', 'partner'), ('peugeot', 'Expert', 'expert'), ('peugeot', 'Boxer', 'boxer'), ('peugeot', 'Diğer', 'diger'),
    ('polestar', 'Polestar 2', 'polestar-2'), ('polestar', 'Polestar 3', 'polestar-3'), ('polestar', 'Polestar 4', 'polestar-4'), ('polestar', 'Diğer', 'diger'),
    ('porsche', '911', '911'), ('porsche', 'Boxster', 'boxster'), ('porsche', 'Cayman', 'cayman'), ('porsche', 'Cayenne', 'cayenne'), ('porsche', 'Macan', 'macan'), ('porsche', 'Panamera', 'panamera'), ('porsche', 'Taycan', 'taycan'), ('porsche', '718', '718'), ('porsche', 'Diğer', 'diger'),
    ('proton', 'Gen-2', 'gen-2'), ('proton', 'Persona', 'persona'), ('proton', 'Saga', 'saga'), ('proton', 'Waja', 'waja'), ('proton', 'Diğer', 'diger'),
    ('ram', '1500', '1500'), ('ram', '2500', '2500'), ('ram', '3500', '3500'), ('ram', 'Diğer', 'diger'),
    ('renault', 'Clio', 'clio'), ('renault', 'Megane', 'megane'), ('renault', 'Symbol', 'symbol'), ('renault', 'Taliant', 'taliant'), ('renault', 'Fluence', 'fluence'), ('renault', 'Laguna', 'laguna'), ('renault', 'Latitude', 'latitude'), ('renault', 'Captur', 'captur'), ('renault', 'Kadjar', 'kadjar'), ('renault', 'Austral', 'austral'), ('renault', 'Koleos', 'koleos'), ('renault', 'Arkana', 'arkana'), ('renault', 'Scenic', 'scenic'), ('renault', 'Espace', 'espace'), ('renault', 'Zoe', 'zoe'), ('renault', 'Kangoo', 'kangoo'), ('renault', 'Master', 'master'), ('renault', 'Trafic', 'trafic'), ('renault', 'Diğer', 'diger'),
    ('rolls-royce', 'Ghost', 'ghost'), ('rolls-royce', 'Phantom', 'phantom'), ('rolls-royce', 'Wraith', 'wraith'), ('rolls-royce', 'Dawn', 'dawn'), ('rolls-royce', 'Cullinan', 'cullinan'), ('rolls-royce', 'Spectre', 'spectre'), ('rolls-royce', 'Diğer', 'diger'),
    ('rover', '25', '25'), ('rover', '45', '45'), ('rover', '75', '75'), ('rover', '200', '200'), ('rover', '400', '400'), ('rover', '600', '600'), ('rover', 'Diğer', 'diger'),
    ('saab', '9-3', '9-3'), ('saab', '9-5', '9-5'), ('saab', '900', '900'), ('saab', '9000', '9000'), ('saab', 'Diğer', 'diger'),
    ('seat', 'Alhambra', 'alhambra'), ('seat', 'Altea', 'altea'), ('seat', 'Arona', 'arona'), ('seat', 'Ateca', 'ateca'), ('seat', 'Cordoba', 'cordoba'), ('seat', 'Ibiza', 'ibiza'), ('seat', 'Leon', 'leon'), ('seat', 'Toledo', 'toledo'), ('seat', 'Tarraco', 'tarraco'), ('seat', 'Diğer', 'diger'),
    ('skoda', 'Fabia', 'fabia'), ('skoda', 'Octavia', 'octavia'), ('skoda', 'Superb', 'superb'), ('skoda', 'Scala', 'scala'), ('skoda', 'Rapid', 'rapid'), ('skoda', 'Roomster', 'roomster'), ('skoda', 'Kamiq', 'kamiq'), ('skoda', 'Karoq', 'karoq'), ('skoda', 'Kodiaq', 'kodiaq'), ('skoda', 'Yeti', 'yeti'), ('skoda', 'Enyaq', 'enyaq'), ('skoda', 'Diğer', 'diger'),
    ('smart', 'Fortwo', 'fortwo'), ('smart', 'Forfour', 'forfour'), ('smart', '#1', '1'), ('smart', '#3', '3'), ('smart', 'Diğer', 'diger'),
    ('ssangyong', 'Actyon', 'actyon'), ('ssangyong', 'Korando', 'korando'), ('ssangyong', 'Kyron', 'kyron'), ('ssangyong', 'Musso', 'musso'), ('ssangyong', 'Rexton', 'rexton'), ('ssangyong', 'Tivoli', 'tivoli'), ('ssangyong', 'Torres', 'torres'), ('ssangyong', 'Diğer', 'diger'),
    ('subaru', 'BRZ', 'brz'), ('subaru', 'Forester', 'forester'), ('subaru', 'Impreza', 'impreza'), ('subaru', 'Legacy', 'legacy'), ('subaru', 'Levorg', 'levorg'), ('subaru', 'Outback', 'outback'), ('subaru', 'XV', 'xv'), ('subaru', 'Solterra', 'solterra'), ('subaru', 'Diğer', 'diger'),
    ('suzuki', 'Alto', 'alto'), ('suzuki', 'Baleno', 'baleno'), ('suzuki', 'Grand Vitara', 'grand-vitara'), ('suzuki', 'Ignis', 'ignis'), ('suzuki', 'Jimny', 'jimny'), ('suzuki', 'Samurai', 'samurai'), ('suzuki', 'S-Cross', 's-cross'), ('suzuki', 'Splash', 'splash'), ('suzuki', 'Swift', 'swift'), ('suzuki', 'SX4', 'sx4'), ('suzuki', 'Vitara', 'vitara'), ('suzuki', 'Diğer', 'diger'),
    ('tata', 'Indica', 'indica'), ('tata', 'Indigo', 'indigo'), ('tata', 'Safari', 'safari'), ('tata', 'Xenon', 'xenon'), ('tata', 'Vista', 'vista'), ('tata', 'Diğer', 'diger'),
    ('tesla', 'Model 3', 'model-3'), ('tesla', 'Model Y', 'model-y'), ('tesla', 'Model S', 'model-s'), ('tesla', 'Model X', 'model-x'), ('tesla', 'Cybertruck', 'cybertruck'), ('tesla', 'Roadster', 'roadster'), ('tesla', 'Diğer', 'diger'),
    ('tofas', 'Doğan', 'dogan'), ('tofas', 'Şahin', 'sahin'), ('tofas', 'Kartal', 'kartal'), ('tofas', 'Murat 124', 'murat-124'), ('tofas', 'Serçe', 'serce'), ('tofas', 'Diğer', 'diger'),
    ('togg', 'T10X', 't10x'), ('togg', 'T10F', 't10f'), ('togg', 'Diğer', 'diger'),
    ('toyota', 'Auris', 'auris'), ('toyota', 'Avensis', 'avensis'), ('toyota', 'Camry', 'camry'), ('toyota', 'Corolla', 'corolla'), ('toyota', 'Corolla Cross', 'corolla-cross'), ('toyota', 'C-HR', 'c-hr'), ('toyota', 'Hilux', 'hilux'), ('toyota', 'Land Cruiser', 'land-cruiser'), ('toyota', 'Prius', 'prius'), ('toyota', 'Proace', 'proace'), ('toyota', 'RAV4', 'rav4'), ('toyota', 'Supra', 'supra'), ('toyota', 'Urban Cruiser', 'urban-cruiser'), ('toyota', 'Verso', 'verso'), ('toyota', 'Yaris', 'yaris'), ('toyota', 'Yaris Cross', 'yaris-cross'), ('toyota', 'bZ4X', 'bz4x'), ('toyota', 'Diğer', 'diger'),
    ('volkswagen', 'Amarok', 'amarok'), ('volkswagen', 'Arteon', 'arteon'), ('volkswagen', 'Bora', 'bora'), ('volkswagen', 'Caddy', 'caddy'), ('volkswagen', 'Caravelle', 'caravelle'), ('volkswagen', 'CC', 'cc'), ('volkswagen', 'Golf', 'golf'), ('volkswagen', 'Jetta', 'jetta'), ('volkswagen', 'Multivan', 'multivan'), ('volkswagen', 'Passat', 'passat'), ('volkswagen', 'Polo', 'polo'), ('volkswagen', 'Scirocco', 'scirocco'), ('volkswagen', 'Sharan', 'sharan'), ('volkswagen', 'Taigo', 'taigo'), ('volkswagen', 'Tiguan', 'tiguan'), ('volkswagen', 'Touareg', 'touareg'), ('volkswagen', 'Touran', 'touran'), ('volkswagen', 'Transporter', 'transporter'), ('volkswagen', 'T-Cross', 't-cross'), ('volkswagen', 'T-Roc', 't-roc'), ('volkswagen', 'ID.3', 'id-3'), ('volkswagen', 'ID.4', 'id-4'), ('volkswagen', 'ID.5', 'id-5'), ('volkswagen', 'ID. Buzz', 'id-buzz'), ('volkswagen', 'Diğer', 'diger'),
    ('volvo', 'C30', 'c30'), ('volvo', 'C40', 'c40'), ('volvo', 'S40', 's40'), ('volvo', 'S60', 's60'), ('volvo', 'S80', 's80'), ('volvo', 'S90', 's90'), ('volvo', 'V40', 'v40'), ('volvo', 'V50', 'v50'), ('volvo', 'V60', 'v60'), ('volvo', 'V70', 'v70'), ('volvo', 'V90', 'v90'), ('volvo', 'XC40', 'xc40'), ('volvo', 'XC60', 'xc60'), ('volvo', 'XC70', 'xc70'), ('volvo', 'XC90', 'xc90'), ('volvo', 'EX30', 'ex30'), ('volvo', 'EX90', 'ex90'), ('volvo', 'Diğer', 'diger'),
    ('voyah', 'Free', 'free'), ('voyah', 'Dream', 'dream'), ('voyah', 'Passion', 'passion'), ('voyah', 'Diğer', 'diger'),
    ('zeekr', '001', '001'), ('zeekr', '007', '007'), ('zeekr', 'X', 'x'), ('zeekr', '009', '009'), ('zeekr', 'Diğer', 'diger'),
    ('diger', 'Diğer', 'diger')
)
INSERT INTO vehicle.models (make_id, name, slug, is_active)
SELECT ma.id, ms.name, ms.slug, TRUE
FROM model_seed ms
INNER JOIN vehicle.makes ma ON ma.slug = ms.make_slug
ON CONFLICT (make_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = TRUE;

REVOKE ALL ON public.ff_cities FROM PUBLIC;
GRANT SELECT ON public.ff_cities TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- migrate:up
-- Impuesto sobre la renta al salario: tramos mensuales con fecha de vigencia (Hacienda los actualiza cada año
-- por decreto). Como las tasas de la CCSS, no se borran: un año nuevo es otro juego de tramos.
create table tramos_renta (
  vigente_desde date not null,
  desde numeric(14,2) not null check (desde >= 0),
  hasta numeric(14,2) check (hasta is null or hasta > desde),   -- null = en adelante
  tasa numeric(5,2) not null check (tasa >= 0 and tasa <= 100),
  fuente_legal text not null,
  primary key (vigente_desde, desde)
);
create trigger tramos_renta_bitacora after insert or update or delete on tramos_renta for each row execute function registrar_bitacora();
create trigger tramos_renta_no_delete before delete on tramos_renta for each row execute function bloquear_delete();
alter table tramos_renta enable row level security;
create policy tramos_renta_lectura on tramos_renta for select using (puede_leer());
create policy tramos_renta_insert on tramos_renta for insert with check (es_admin());
create policy tramos_renta_update on tramos_renta for update using (es_admin()) with check (es_admin());

-- 2026: Decreto Ejecutivo 45333-H (La Gaceta, 5 de diciembre de 2025), vigente desde el 1 de enero de 2026.
-- Montos mensuales en colones, sobre el exceso de cada tramo.
insert into tramos_renta (vigente_desde, desde, hasta, tasa, fuente_legal) values
  ('2026-01-01', 0, 918000, 0, 'Decreto Ejecutivo 45333-H (2026)'),
  ('2026-01-01', 918000, 1347000, 10, 'Decreto Ejecutivo 45333-H (2026)'),
  ('2026-01-01', 1347000, 2364000, 15, 'Decreto Ejecutivo 45333-H (2026)'),
  ('2026-01-01', 2364000, 4727000, 20, 'Decreto Ejecutivo 45333-H (2026)'),
  ('2026-01-01', 4727000, null, 25, 'Decreto Ejecutivo 45333-H (2026)');

-- Tramos que rigen en una fecha (el juego más reciente que ya empezó).
create or replace function tramos_renta_vigentes(p_fecha date default current_date)
returns table (desde numeric, hasta numeric, tasa numeric)
language sql stable as $$
  select t.desde, t.hasta, t.tasa from tramos_renta t
  where t.vigente_desde = (select max(vigente_desde) from tramos_renta where vigente_desde <= p_fecha)
  order by t.desde
$$;

-- migrate:down

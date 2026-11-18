-- migrate:up
-- Ajustes pedidos por la fundación (18/11/2026):
--  1. El espacio usado solo lo ve el superadministrador.
--  2. Baja cuantía (PANI): un artículo es activo solo si su costo por unidad supera el 25 % de un salario base
--     (Resolución DGT-R-009-2015, La Gaceta n.º 90 del 12/05/2015, punto III). Ambos valores son parámetros.
--  3. Un activo puede registrarse sin ubicación (queda pendiente hasta ubicarlo).
--  4. Cada compra guarda varios archivos (la factura electrónica trae 2 XML y 1 PDF).

-- 1 ------------------------------------------------------------------------------------------------
create or replace function espacio_usado() returns table (base_bytes bigint, archivos_bytes bigint, archivos int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_superadmin() then
    raise exception 'Solo el superadministrador ve el espacio usado.' using errcode = '42501';
  end if;
  return query select pg_database_size(current_database()), coalesce(sum(a.tamano), 0)::bigint, count(*)::int from archivos a;
end $$;

-- 2 ------------------------------------------------------------------------------------------------
insert into parametros (clave, valor, vigente_desde, fuente_legal)
select 'salario_base', 462200, '2026-01-01', 'Salario base 2026 (referencia del PANI para baja cuantía)'
where not exists (select 1 from parametros where clave = 'salario_base' and vigente_desde = '2026-01-01');
insert into parametros (clave, valor, vigente_desde, fuente_legal)
select 'baja_cuantia_pct_salario_base', 25, '2015-05-12', 'Resolución DGT-R-009-2015 (La Gaceta 90, 12/05/2015), punto III'
where not exists (select 1 from parametros where clave = 'baja_cuantia_pct_salario_base');

-- Monto a partir del cual un artículo es activo (por unidad). Null si falta algún parámetro.
create or replace function umbral_activo(p_fecha date default current_date) returns numeric
language sql stable as $$
  select round(parametro('salario_base', p_fecha) * parametro('baja_cuantia_pct_salario_base', p_fecha) / 100, 2)
$$;

-- 3 ------------------------------------------------------------------------------------------------
alter table activos alter column ubicacion_id drop not null;

create or replace function activos_al_corte(p_corte date, p_fuente text default null)
returns table (
  activo_id uuid, placa text, tipo_bien text, marca text, modelo text, serie text,
  ubicacion text, fuente text, fecha_adquisicion date, costo numeric,
  categoria text, tasa_anual numeric, depreciacion_acumulada numeric, valor_libros numeric
) language sql stable as $$
  select a.id, a.placa, a.tipo_bien, a.marca, a.modelo, a.serie,
         u.nombre, f.codigo, a.fecha_adquisicion, a.costo, c.nombre,
         coalesce(a.tasa_anual_override, c.tasa_anual),
         d.dep, a.costo - d.dep
  from activos a
  left join ubicaciones u on u.id = a.ubicacion_id
  join fuentes_financiamiento f on f.id = a.fuente_id
  left join categorias_activo c on c.id = a.categoria_id
  cross join lateral (
    select depreciacion_acumulada(a.costo, a.valor_residual,
             coalesce(a.tasa_anual_override, c.tasa_anual), c.anios_vida, a.metodo,
             a.fecha_adquisicion, least(p_corte, coalesce(a.fecha_baja, p_corte))) as dep
  ) d
  where (a.fecha_adquisicion is null or a.fecha_adquisicion <= p_corte)
    and (a.fecha_baja is null or a.fecha_baja > p_corte)
    and (p_fuente is null or f.codigo = p_fuente)
  order by u.nombre nulls first, a.placa
$$;

create or replace view v_activos_alertas with (security_invoker = true) as
select a.id as activo_id, a.placa, a.tipo_bien, u.nombre as ubicacion, x.alerta
from activos a
left join ubicaciones u on u.id = a.ubicacion_id
cross join lateral (
  select 'Sin ubicación' where a.ubicacion_id is null
  union all select 'Sin placa' where a.placa is null
  union all select 'Placa repetida en otro activo' where a.placa is not null and exists (
    select 1 from activos b where b.placa = a.placa and b.id <> a.id and b.estado <> 'dado_de_baja')
  union all select 'Sin fecha de adquisición' where a.fecha_adquisicion is null
  union all select 'Sin costo de adquisición' where a.costo is null
  union all select 'Sin categoría de depreciación' where a.categoria_id is null
  union all select 'Sin factura adjunta' where a.compra_linea_id is null
  union all select 'Serie repetida en otro activo' where coalesce(a.serie,'') not in ('', 'NO INDICA') and exists (
    select 1 from activos b where b.serie = a.serie and b.id <> a.id)
) x(alerta)
where a.estado <> 'dado_de_baja';

-- 4 ------------------------------------------------------------------------------------------------
alter table archivos drop constraint archivos_tipo_check;
alter table archivos add constraint archivos_tipo_check
  check (tipo in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/xml', 'text/xml'));

create table compra_archivos (
  compra_id uuid not null references compras(id),
  archivo_id uuid not null references archivos(id),
  creado_en timestamptz not null default now(),
  primary key (compra_id, archivo_id)
);
create trigger compra_archivos_bitacora after insert or update or delete on compra_archivos for each row execute function registrar_bitacora();
create trigger compra_archivos_no_delete before delete on compra_archivos for each row execute function bloquear_delete();
alter table compra_archivos enable row level security;
create policy compra_archivos_lectura on compra_archivos for select using (puede_leer());
create policy compra_archivos_insert on compra_archivos for insert with check (puede_escribir());
create policy compra_archivos_update on compra_archivos for update using (puede_escribir()) with check (puede_escribir());

-- Las facturas que ya estaban adjuntas pasan a la lista de archivos de su compra.
insert into compra_archivos (compra_id, archivo_id)
select c.id, substring(c.factura_url from '([0-9a-f-]{36})$')::uuid from compras c
where c.factura_url ~ '/portal/archivos/[0-9a-f-]{36}$'
  and exists (select 1 from archivos a where a.id = substring(c.factura_url from '([0-9a-f-]{36})$')::uuid)
on conflict do nothing;

-- migrate:down

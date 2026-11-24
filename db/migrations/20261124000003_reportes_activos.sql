-- migrate:up
-- Reportes de activos armados por la fundación: cada uno guarda sus especificaciones (fondos, monto mínimo,
-- agrupación, filtros) y se exporta con el formato del Auxiliar de activos fijos. Los activos no tienen
-- monto mínimo: la regla vive en cada reporte.
create table reportes_activos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  config jsonb not null,
  activo boolean not null default true,
  creado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger reportes_activos_bitacora after insert or update or delete on reportes_activos for each row execute function registrar_bitacora();
create trigger reportes_activos_no_delete before delete on reportes_activos for each row execute function bloquear_delete();
alter table reportes_activos enable row level security;
create policy reportes_activos_lectura on reportes_activos for select using (puede_leer());
create policy reportes_activos_insert on reportes_activos for insert with check (es_admin());
create policy reportes_activos_update on reportes_activos for update using (es_admin()) with check (es_admin());

-- migrate:down

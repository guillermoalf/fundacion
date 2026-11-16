-- migrate:up
-- Tabla de depreciación (filas del Anexo 2). Decisiones de la fundación (04/11/2026):
-- 1. Solo admin (la directora) agrega o edita filas.
-- 2. La tasa y los años de vida de una fila que ya usan activos no se editan: para otra tasa se
--    crea una fila nueva y se reasignan los activos. Así un reporte ya entregado nunca cambia.
-- 3. Una fila se retira con activa = false (nada se borra): deja de ofrecerse para activos nuevos
--    o reasignaciones, y los activos que ya la tienen la conservan.

alter table categorias_activo add column activa boolean not null default true;

drop policy categorias_activo_insert on categorias_activo;
create policy categorias_activo_insert on categorias_activo for insert with check (es_admin());
drop policy categorias_activo_update on categorias_activo;
create policy categorias_activo_update on categorias_activo for update
  using (es_admin()) with check (es_admin());

-- security definer: debe ver todos los activos aunque el RLS de quien edita cambie en el futuro.
create or replace function proteger_tasa_categoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.tasa_anual, new.anios_vida) is distinct from (old.tasa_anual, old.anios_vida)
     and exists (select 1 from activos where categoria_id = old.id) then
    raise exception 'La fila "%" ya la usan activos. Para usar otra tasa cree una fila nueva y reasigne los activos.', old.nombre;
  end if;
  return new;
end $$;
create trigger categorias_activo_tasa_fija before update of tasa_anual, anios_vida on categorias_activo
  for each row execute function proteger_tasa_categoria();

create or replace function validar_categoria_activa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.categoria_id is not null
     and (tg_op = 'INSERT' or new.categoria_id is distinct from old.categoria_id)
     and not exists (select 1 from categorias_activo where id = new.categoria_id and activa) then
    raise exception 'La fila de depreciación seleccionada está retirada. Elija una fila activa.';
  end if;
  return new;
end $$;
create trigger activos_categoria_activa before insert or update of categoria_id on activos
  for each row execute function validar_categoria_activa();

-- migrate:down

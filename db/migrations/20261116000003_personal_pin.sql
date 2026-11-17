-- migrate:up
-- Personal: foto para el kiosko y PIN fuera de la tabla de empleados.
-- Un PIN de 4 dígitos tiene solo 10 000 combinaciones: si su hash se pudiera leer desde el portal
-- (auditor, coordinación) se adivina en segundos. Por eso vive en una tabla que app_portal no puede leer;
-- solo se asigna con asignar_pin_empleado() y solo lo verifica el kiosko (conexión del dueño).
alter table empleados add column foto_url text;
alter table empleados drop column pin_hash;

create table empleados_pin (
  empleado_id uuid primary key references empleados(id),
  pin_hash text not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references perfiles(id) default usuario_actual()
);
revoke all on empleados_pin from app_portal;
alter table empleados_pin enable row level security;   -- sin políticas: nadie fuera del dueño

create or replace function asignar_pin_empleado(p_empleado uuid, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not puede_escribir() then
    raise exception 'No tiene permiso para asignar PIN.' using errcode = '42501';
  end if;
  if not exists (select 1 from empleados where id = p_empleado and activo) then
    raise exception 'La persona no existe o está inactiva.';
  end if;
  insert into empleados_pin (empleado_id, pin_hash) values (p_empleado, p_hash)
  on conflict (empleado_id) do update set pin_hash = excluded.pin_hash, actualizado_en = now(), actualizado_por = usuario_actual();
  insert into bitacora (tabla, registro_id, accion, despues)
  values ('empleados_pin', p_empleado::text, 'UPDATE', '{"pin": "asignado"}');
end $$;

-- Quién tiene PIN (sin exponer el hash) para mostrarlo en la lista de personal.
create or replace function empleados_con_pin() returns setof uuid
language sql stable security definer set search_path = public as $$
  select empleado_id from empleados_pin where puede_leer()
$$;

-- migrate:down

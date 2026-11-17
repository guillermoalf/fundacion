-- migrate:up
-- Superadministrador: por encima de la dirección. Puede corregir cualquier dato, también lo cerrado o aprobado
-- (planillas, conteos, marcas, parámetros, tasas en uso, usuarios). Nunca puede borrar: borrar sigue bloqueado
-- para todos, porque los entes auditan el historial. Toda corrección de algo cerrado exige un motivo
-- (app.motivo), que queda en la bitácora junto al antes y el después.

create or replace function es_superadmin() returns boolean
language sql stable as $$ select coalesce(rol_actual() = 'superadmin', false) $$;

-- El superadministrador tiene todos los permisos de los demás roles.
create or replace function puede_escribir() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad', 'coordinacion', 'superadmin') $$;
create or replace function es_admin() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'superadmin') $$;
create or replace function ve_salarios() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad', 'auditor', 'superadmin') $$;
create or replace function edita_salarios() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad', 'superadmin') $$;

create or replace function motivo_actual() returns text
language sql stable as $$ select nullif(trim(current_setting('app.motivo', true)), '') $$;

-- Una corrección por encima de un bloqueo: solo el superadministrador y siempre con motivo.
create or replace function correccion_autorizada() returns boolean language plpgsql stable as $$
begin
  if not es_superadmin() then return false; end if;
  if motivo_actual() is null then
    raise exception 'Para corregir algo cerrado o aprobado hay que escribir el motivo de la corrección.';
  end if;
  return true;
end $$;

-- La bitácora guarda el motivo de cada cambio que lo tenga.
alter table bitacora add column motivo text default motivo_actual();

-- Políticas que nombraban roles a mano.
drop policy planillas_update on planillas;
create policy planillas_update on planillas for update using (edita_salarios()) with check (edita_salarios());
drop policy planilla_lineas_insert on planilla_lineas;
create policy planilla_lineas_insert on planilla_lineas for insert with check (edita_salarios());
drop policy planilla_lineas_update on planilla_lineas;
create policy planilla_lineas_update on planilla_lineas for update using (edita_salarios()) with check (edita_salarios());
drop policy parametros_insert on parametros;
create policy parametros_insert on parametros for insert with check (edita_salarios());
drop policy parametros_update on parametros;
create policy parametros_update on parametros for update using (es_superadmin()) with check (es_superadmin());
drop policy marcas_update on marcas;
create policy marcas_update on marcas for update using (es_superadmin()) with check (es_superadmin());
drop policy archivos_sin_update on archivos;
create policy archivos_update on archivos for update using (es_superadmin()) with check (es_superadmin());
drop policy bitacora_lectura on bitacora;
create policy bitacora_lectura on bitacora for select using (rol_actual() in ('admin', 'auditor', 'contabilidad', 'superadmin'));

-- Los candados dejan pasar la corrección del superadministrador (con motivo).
create or replace function proteger_planilla() returns trigger language plpgsql as $$
begin
  if old.estado <> 'borrador' and correccion_autorizada() then return new; end if;
  if old.estado in ('pagada', 'anulada') then
    raise exception 'Esta planilla ya está %: no se puede cambiar.', old.estado;
  end if;
  if old.estado = 'aprobada' and not (new.estado in ('pagada', 'anulada') and
      (new.periodo_inicio, new.periodo_fin, new.tipo) = (old.periodo_inicio, old.periodo_fin, old.tipo)) then
    raise exception 'La planilla ya está aprobada: solo se puede marcar como pagada o anular.';
  end if;
  if old.estado = 'borrador' and new.estado = 'pagada' then
    raise exception 'Primero hay que aprobar la planilla.';
  end if;
  if new.estado = 'aprobada' and old.estado = 'borrador' then
    new.aprobada_por := usuario_actual();
    new.aprobada_en := now();
  end if;
  return new;
end $$;

create or replace function lineas_solo_en_borrador() returns trigger language plpgsql as $$
begin
  if (select estado from planillas where id = new.planilla_id) <> 'borrador' and not correccion_autorizada() then
    raise exception 'La planilla ya no está en borrador: sus montos no se pueden cambiar.';
  end if;
  return new;
end $$;

create or replace function proteger_conteo() returns trigger language plpgsql as $$
begin
  if old.cerrado and not correccion_autorizada() then
    if not new.cerrado
       or (new.ubicacion_id, new.fecha, new.responsable_id, new.observaciones) is distinct from (old.ubicacion_id, old.fecha, old.responsable_id, old.observaciones)
       or (old.acta_firmada_url is not null and new.acta_firmada_url is distinct from old.acta_firmada_url) then
      raise exception 'El conteo ya está cerrado: solo se puede adjuntar el acta firmada.';
    end if;
  end if;
  return new;
end $$;

create or replace function detalle_solo_abierto() returns trigger language plpgsql as $$
begin
  if (select cerrado from conteos_fisicos where id = new.conteo_id) and not correccion_autorizada() then
    raise exception 'El conteo ya está cerrado: no se puede cambiar lo que se encontró.';
  end if;
  return new;
end $$;

create or replace function proteger_tasa_categoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.tasa_anual, new.anios_vida) is distinct from (old.tasa_anual, old.anios_vida)
     and exists (select 1 from activos where categoria_id = old.id) and not correccion_autorizada() then
    raise exception 'La fila "%" ya la usan activos. Para usar otra tasa cree una fila nueva y reasigne los activos.', old.nombre;
  end if;
  return new;
end $$;

-- El rol de superadministrador solo lo da o lo cambia otro superadministrador (o el sistema, al configurarlo).
create or replace function proteger_superadmin() returns trigger language plpgsql as $$
begin
  if (new.rol = 'superadmin' or (tg_op = 'UPDATE' and old.rol = 'superadmin'))
     and usuario_actual() is not null and not es_superadmin() then
    raise exception 'Solo el superadministrador puede dar, quitar o cambiar ese rol.';
  end if;
  return new;
end $$;
create trigger perfiles_proteger_superadmin before insert or update on perfiles
  for each row execute function proteger_superadmin();

-- crear_usuario_portal: dar el rol de superadministrador pasa por el trigger de arriba.
-- Lista de tablas que se pueden corregir desde el portal (las que tienen bitácora), con su llave.
create or replace function tablas_corregibles()
returns table (tabla text, llave text[])
language sql stable security definer set search_path = public as $$
  select c.relname::text,
         array(select a.attname::text from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
               where i.indrelid = c.oid and i.indisprimary order by array_position(i.indkey::int2[], a.attnum))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and es_superadmin()
    and exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname like '%\_bitacora')
    and c.relname not in ('bitacora')
$$;

-- migrate:down

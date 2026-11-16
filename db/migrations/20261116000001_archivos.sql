-- migrate:up
-- Archivos adjuntos (fotos de facturas, boletas de incapacidad, actas firmadas, hojas de asistencia).
-- Se guardan en la base para que el RLS por rol aplique igual que a los datos (ver docs/PROGRESO.md).
-- Un archivo no se edita ni se borra: si estaba mal, se sube otro y se cambia la referencia.
create table archivos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  tamano int not null check (tamano > 0 and tamano <= 4718592),   -- 4,5 MB
  contenido bytea not null,
  subido_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  check (octet_length(contenido) = tamano)
);

-- La bitácora registra el archivo sin su contenido (pesaría lo mismo que el archivo).
create or replace function registrar_bitacora_archivo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into bitacora (tabla, registro_id, accion, antes, despues)
  values (tg_table_name, coalesce(new.id, old.id)::text, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'contenido' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'contenido' end);
  return coalesce(new, old);
end $$;

create trigger archivos_bitacora after insert or update or delete on archivos
  for each row execute function registrar_bitacora_archivo();
create trigger archivos_no_delete before delete on archivos
  for each row execute function bloquear_delete();
alter table archivos enable row level security;
create policy archivos_lectura on archivos for select using (puede_leer());
create policy archivos_insert on archivos for insert with check (puede_escribir());
create policy archivos_sin_update on archivos for update using (false);

-- migrate:down

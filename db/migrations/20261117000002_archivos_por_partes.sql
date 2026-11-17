-- migrate:up
-- Archivos de hasta 5 MB (PDF tal cual; las fotos ya llegan comprimidas del navegador).
-- Vercel acepta como máximo 4,5 MB por petición, así que el navegador sube el archivo en partes de 3 MB
-- a /portal/archivos/subir y al final se arma en `archivos` con completar_archivo().
alter table archivos drop constraint archivos_tamano_check;
alter table archivos add constraint archivos_tamano_check check (tamano > 0 and tamano <= 5242880);

create table archivos_partes (
  subida_id uuid not null,
  parte smallint not null check (parte between 0 and 9),
  contenido bytea not null check (octet_length(contenido) <= 3145728),
  subido_por uuid not null default usuario_actual() references perfiles(id),
  creado_en timestamptz not null default now(),
  primary key (subida_id, parte)
);
-- Es un área de paso (no se audita): cada quien solo sube partes a su nombre y no las lee.
alter table archivos_partes enable row level security;
create policy archivos_partes_insert on archivos_partes for insert with check (puede_escribir() and subido_por = usuario_actual());
revoke select, update on archivos_partes from app_portal;

create or replace function completar_archivo(p_subida uuid, p_nombre text, p_tipo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_contenido bytea; v_partes int; v_max int;
begin
  if not puede_escribir() then
    raise exception 'No tiene permiso para subir archivos.' using errcode = '42501';
  end if;
  select string_agg(contenido, ''::bytea order by parte), count(*), max(parte)
    into v_contenido, v_partes, v_max
  from archivos_partes where subida_id = p_subida and subido_por = usuario_actual();
  if v_partes is null or v_partes = 0 or v_partes <> v_max + 1 then
    raise exception 'El archivo no llegó completo. Intente subirlo de nuevo.';
  end if;
  insert into archivos (nombre, tipo, tamano, contenido)
  values (left(coalesce(nullif(p_nombre, ''), 'archivo'), 200), p_tipo, octet_length(v_contenido), v_contenido)
  returning id into v_id;
  delete from archivos_partes where subida_id = p_subida;
  return v_id;
end $$;

-- Espacio que ocupan la base y los archivos (para el inicio de la dirección).
create or replace function espacio_usado() returns table (base_bytes bigint, archivos_bytes bigint, archivos int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo la dirección ve el espacio usado.' using errcode = '42501';
  end if;
  return query select pg_database_size(current_database()), coalesce(sum(a.tamano), 0)::bigint, count(*)::int from archivos a;
end $$;

-- migrate:down

-- migrate:up
-- Foto de perfil de cada usuario (sale en el menú en vez de la inicial). Cada quien cambia solo la suya.
-- Llega del navegador ya recortada y comprimida (256 px, JPEG): por eso el tope es pequeño.
create table fotos_perfil (
  id uuid primary key references perfiles(id) on delete restrict default usuario_actual(),
  tipo text check (tipo in ('image/jpeg', 'image/png', 'image/webp')),
  contenido bytea,
  actualizada_en timestamptz not null default now(),
  check ((contenido is null) = (tipo is null)),
  check (contenido is null or octet_length(contenido) <= 307200)
);

-- Igual que archivos: la bitácora registra el cambio sin la imagen.
create trigger fotos_perfil_bitacora after insert or update or delete on fotos_perfil
  for each row execute function registrar_bitacora_archivo();
create trigger fotos_perfil_no_delete before delete on fotos_perfil
  for each row execute function bloquear_delete();
alter table fotos_perfil enable row level security;
-- La ven quien puede leer el portal y la propia persona (incluido el rol personal).
create policy fotos_perfil_lectura on fotos_perfil for select using (id = usuario_actual() or puede_leer());
-- Quitar la foto = dejar contenido en null (nunca se borra la fila).
create policy fotos_perfil_insert on fotos_perfil for insert with check (id = usuario_actual() and rol_actual() is not null);
create policy fotos_perfil_update on fotos_perfil for update using (id = usuario_actual()) with check (id = usuario_actual());

-- migrate:down

-- migrate:up
-- Kiosko de asistencia (/marcar): tablet fija en la entrada.
-- Cada tablet se registra desde el portal (solo admin) y guarda un token largo en una cookie;
-- aquí solo queda el hash del token. Las marcas del kiosko las inserta el servidor con la conexión
-- del dueño después de validar token + PIN (no hay usuario del portal en la tablet).

create table dispositivos_kiosko (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  token_hash text not null unique,
  activo boolean not null default true,
  ultimo_uso timestamptz,
  creado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now()
);
create trigger dispositivos_kiosko_bitacora after insert or update or delete on dispositivos_kiosko
  for each row execute function registrar_bitacora();
create trigger dispositivos_kiosko_no_delete before delete on dispositivos_kiosko
  for each row execute function bloquear_delete();
alter table dispositivos_kiosko enable row level security;
create policy dispositivos_kiosko_lectura on dispositivos_kiosko for select using (es_admin());
create policy dispositivos_kiosko_insert on dispositivos_kiosko for insert with check (es_admin());
create policy dispositivos_kiosko_update on dispositivos_kiosko for update using (es_admin()) with check (es_admin());

-- De qué tablet vino cada marca y, si es manual, la foto de la hoja firmada.
alter table marcas add column dispositivo_id uuid references dispositivos_kiosko(id);
alter table marcas add column documento_url text;
alter table marcas add constraint marca_kiosko_con_dispositivo check (origen <> 'kiosko' or dispositivo_id is not null);
alter table marcas alter column registrado_por set default usuario_actual();

-- Intentos de PIN (para frenar a quien prueba PIN al azar). Solo los usa el servidor del kiosko.
create table intentos_pin (
  id bigserial primary key,
  empleado_id uuid not null references empleados(id),
  dispositivo_id uuid not null references dispositivos_kiosko(id),
  exitoso boolean not null,
  en timestamptz not null default now()
);
create index on intentos_pin (empleado_id, en);
create index on intentos_pin (dispositivo_id, en);
revoke all on intentos_pin from app_portal;
revoke all on intentos_pin_id_seq from app_portal;
alter table intentos_pin enable row level security;   -- sin políticas: solo el dueño

-- migrate:down

-- migrate:up
-- =====================================================================
-- Autenticación (Better Auth) y quién hace cada cambio.
--
-- La app se conecta con el dueño de la base, pero cada consulta del portal corre dentro de una
-- transacción que hace `set local role app_portal` y guarda el usuario en `app.usuario_id`
-- (ver src/lib/db/index.ts → conUsuario). app_portal no es dueño de nada: el RLS le aplica siempre.
-- usuario_actual() es quien está haciendo el cambio: lo usan el RLS y la bitácora.
-- =====================================================================

create extension if not exists pgcrypto;

-- Tablas de Better Auth (src/lib/auth.ts mapea los nombres). app_portal no tiene permisos sobre ellas:
-- solo las usa Better Auth con la conexión del dueño. Se crean antes de los permisos por defecto de abajo.
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  correo text not null unique,
  correo_verificado boolean not null default false,
  imagen text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  token text not null unique,
  expira_en timestamptz not null,
  ip text,
  navegador text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on sesiones (usuario_id);

create table cuentas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  cuenta_id text not null,
  proveedor_id text not null,             -- 'credential' = correo y contraseña
  contrasena text,                        -- hash (scrypt), nunca el texto
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expira_en timestamptz,
  refresh_token_expira_en timestamptz,
  scope text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on cuentas (usuario_id);

create table verificaciones (
  id uuid primary key default gen_random_uuid(),
  identificador text not null,
  valor text not null,
  expira_en timestamptz not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on verificaciones (identificador);

-- Rol con el que corre el portal. Sin login: solo se entra con SET ROLE desde la conexión del dueño.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_portal') then
    create role app_portal nologin noinherit;
  end if;
end $$;
grant app_portal to current_user;
grant usage on schema public to app_portal;

-- Todo lo que creen las migraciones siguientes queda disponible para app_portal (el RLS decide qué filas).
-- Sin DELETE: nada se borra.
alter default privileges in schema public grant select, insert, update on tables to app_portal;
alter default privileges in schema public grant usage, select on sequences to app_portal;

create or replace function usuario_actual() returns uuid
language sql stable as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

-- migrate:down

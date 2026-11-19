-- migrate:up
-- Niños y niñas: registro, responsables, notas y asistencia diaria (lo que piden el IMAS y el PANI).
-- Son datos de menores (Ley 8968): cada tabla tiene su propio permiso de lectura.

-- El rol "personal" no ve nada administrativo (activos, compras, personal, planilla…): solo lo de los niños.
create or replace function puede_leer() returns boolean
language sql stable as $$ select coalesce(rol_actual() <> 'personal', false) $$;

create or replace function ve_ninos() returns boolean
language sql stable as $$ select coalesce(rol_actual() in ('admin', 'superadmin', 'coordinacion', 'auditor', 'personal'), false) $$;
create or replace function ve_notas_ninos() returns boolean
language sql stable as $$ select coalesce(rol_actual() in ('admin', 'superadmin', 'coordinacion', 'auditor'), false) $$;
create or replace function edita_ninos() returns boolean
language sql stable as $$ select coalesce(rol_actual() in ('admin', 'superadmin', 'coordinacion'), false) $$;
create or replace function pasa_lista() returns boolean
language sql stable as $$ select edita_ninos() or coalesce(rol_actual() = 'personal', false) $$;

-- Cada quien ve su propio perfil (el personal lo necesita para entrar) y el personal ve los nombres de las aulas.
create policy perfiles_propio on perfiles for select using (id = usuario_actual() and rol_actual() is not null);
create policy ubicaciones_personal on ubicaciones for select using (rol_actual() = 'personal');

create table ninos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text not null,
  identificacion text,
  fecha_nacimiento date,
  sexo text check (sexo in ('F', 'M')),
  provincia text,
  canton text,
  distrito text,
  direccion text,
  aula_id integer references ubicaciones(id),
  fuente_id smallint references fuentes_financiamiento(id),
  fecha_ingreso date not null default current_date,
  estado text not null default 'activo' check (estado in ('activo', 'retirado')),
  fecha_retiro date,
  motivo_retiro text,
  alergias text,
  condicion_medica text,
  medicamentos text,
  creado_en timestamptz not null default now(),
  creado_por uuid references perfiles(id) default usuario_actual(),
  check (estado = 'activo' or (fecha_retiro is not null and motivo_retiro is not null))
);

-- La misma cédula no se registra dos veces.
create unique index ninos_identificacion_unica on ninos (identificacion) where identificacion is not null;

create table responsables_nino (
  id serial primary key,
  nino_id uuid not null references ninos(id),
  nombre text not null,
  parentesco text not null,
  identificacion text,
  telefono text,
  otro_telefono text,
  correo text,
  otro_contacto text,
  es_legal boolean not null default false,
  puede_recoger boolean not null default true,
  orden smallint not null default 1,
  activo boolean not null default true,
  notas text
);
create index on responsables_nino (nino_id);

create table notas_nino (
  id serial primary key,
  nino_id uuid not null references ninos(id),
  fecha date not null default current_date,
  texto text not null,
  autor uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now()
);
create index on notas_nino (nino_id);

create table asistencia_ninos (
  id bigserial primary key,
  nino_id uuid not null references ninos(id),
  fecha date not null,
  estado text not null check (estado in ('presente', 'ausente', 'justificada')),
  hora_llegada time,
  motivo text,
  registrado_por uuid references perfiles(id) default usuario_actual(),
  registrado_en timestamptz not null default now(),
  unique (nino_id, fecha)
);

do $$
declare t text;
begin
  foreach t in array array['ninos', 'responsables_nino', 'notas_nino', 'asistencia_ninos'] loop
    execute format('create trigger %I_bitacora after insert or update or delete on %I
                    for each row execute function registrar_bitacora()', t, t);
    execute format('create trigger %I_no_delete before delete on %I
                    for each row execute function bloquear_delete()', t, t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy ninos_lectura on ninos for select using (ve_ninos());
create policy ninos_insert on ninos for insert with check (edita_ninos());
create policy ninos_update on ninos for update using (edita_ninos()) with check (edita_ninos());

create policy responsables_nino_lectura on responsables_nino for select using (ve_ninos());
create policy responsables_nino_insert on responsables_nino for insert with check (edita_ninos());
create policy responsables_nino_update on responsables_nino for update using (edita_ninos()) with check (edita_ninos());

-- Las notas no se cambian: se agrega otra. Solo el superadministrador corrige una.
create policy notas_nino_lectura on notas_nino for select using (ve_notas_ninos());
create policy notas_nino_insert on notas_nino for insert with check (edita_ninos());
create policy notas_nino_update on notas_nino for update using (es_superadmin()) with check (es_superadmin());

-- El personal pasa lista solo del día; la dirección y coordinación corrigen días anteriores (queda en la bitácora).
create policy asistencia_ninos_lectura on asistencia_ninos for select using (ve_ninos());
create policy asistencia_ninos_insert on asistencia_ninos for insert
  with check (edita_ninos() or (pasa_lista() and fecha = current_date));
create policy asistencia_ninos_update on asistencia_ninos for update
  using (edita_ninos() or (pasa_lista() and fecha = current_date))
  with check (edita_ninos() or (pasa_lista() and fecha = current_date));

-- No se pasa lista a un niño retirado (después de su retiro) ni antes de su ingreso.
create or replace function validar_asistencia_nino() returns trigger language plpgsql as $$
declare n ninos;
begin
  select * into n from ninos where id = new.nino_id;
  if new.fecha < n.fecha_ingreso then
    raise exception 'Ese día % todavía no había ingresado a la fundación.', n.nombre;
  end if;
  if n.estado = 'retirado' and new.fecha > n.fecha_retiro and not correccion_autorizada() then
    raise exception '% ya está retirado: no se le pasa lista.', n.nombre;
  end if;
  if new.estado <> 'presente' then new.hora_llegada := null; end if;
  new.registrado_por := usuario_actual();
  new.registrado_en := now();
  return new;
end $$;
create trigger asistencia_ninos_validar before insert or update on asistencia_ninos
  for each row execute function validar_asistencia_nino();

-- migrate:down

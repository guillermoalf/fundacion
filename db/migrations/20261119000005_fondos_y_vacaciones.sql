-- migrate:up
-- 1) Salario pagado por varios fondos: cada fondo con un monto fijo y, si hace falta, uno que paga «el resto».
--    Ej.: PANI paga ₡X (licenciatura) e IMAS el excedente. Historial por vigente_desde (como `salarios`).
create table salario_aportes (
  empleado_id uuid not null references empleados(id),
  vigente_desde date not null,
  fuente_id smallint not null references fuentes_financiamiento(id),
  monto numeric(12,2) check (monto >= 0),          -- null = paga el resto del salario
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  primary key (empleado_id, vigente_desde, fuente_id)
);
create unique index salario_aportes_un_resto on salario_aportes (empleado_id, vigente_desde) where monto is null;
create trigger salario_aportes_bitacora after insert or update or delete on salario_aportes for each row execute function registrar_bitacora();
create trigger salario_aportes_no_delete before delete on salario_aportes for each row execute function bloquear_delete();
alter table salario_aportes enable row level security;
create policy salario_aportes_lectura on salario_aportes for select using (ve_salarios());
create policy salario_aportes_insert on salario_aportes for insert with check (edita_salarios());
create policy salario_aportes_update on salario_aportes for update using (es_superadmin()) with check (es_superadmin());

-- Cada línea de planilla guarda cómo se repartió entre fondos (queda fija al aprobarla).
alter table planilla_lineas add column reparto_fuentes jsonb;

-- 2) Vacaciones
-- Saldo con el que se empieza a llevar en el portal (lo que traía de antes), a una fecha.
alter table empleados add column vacaciones_saldo_inicial numeric(6,2), add column vacaciones_saldo_al date,
  add constraint vacaciones_saldo_completo check ((vacaciones_saldo_inicial is null) = (vacaciones_saldo_al is null));
-- Un usuario del portal corresponde a lo sumo a una persona del personal (para «Mis vacaciones»).
create unique index empleados_perfil_unico on empleados (perfil_id) where perfil_id is not null;

create or replace function mi_empleado() returns uuid
language sql stable security definer set search_path = public as $$
  select id from empleados where perfil_id = usuario_actual() and activo limit 1
$$;

-- Cada quien ve su propia ficha, sus ausencias y el parámetro de días de vacaciones (aunque sea del rol Personal).
create policy empleados_propio on empleados for select using (perfil_id = usuario_actual() and rol_actual() is not null);
create policy ausencias_propias on ausencias for select using (empleado_id = mi_empleado());
create policy parametros_vacaciones on parametros for select using (clave = 'vacaciones_dias_habiles_anuales' and rol_actual() is not null);

create table solicitudes_vacaciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id),
  desde date not null,
  hasta date not null,
  dias_habiles numeric(5,2) not null check (dias_habiles > 0),
  nota text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'anulada')),
  solicitada_por uuid references perfiles(id) default usuario_actual(),
  creada_en timestamptz not null default now(),
  resuelta_por uuid references perfiles(id),
  resuelta_en timestamptz,
  respuesta text,
  ausencia_id uuid references ausencias(id),
  check (hasta >= desde)
);
create index on solicitudes_vacaciones (empleado_id);
create trigger solicitudes_vacaciones_bitacora after insert or update or delete on solicitudes_vacaciones for each row execute function registrar_bitacora();
create trigger solicitudes_vacaciones_no_delete before delete on solicitudes_vacaciones for each row execute function bloquear_delete();
alter table solicitudes_vacaciones enable row level security;
create policy solicitudes_vacaciones_lectura on solicitudes_vacaciones for select using (puede_leer() or empleado_id = mi_empleado());
-- Se solicita para uno mismo; la dirección o coordinación también puede registrarla a nombre de alguien.
create policy solicitudes_vacaciones_insert on solicitudes_vacaciones for insert
  with check (estado = 'pendiente' and (empleado_id = mi_empleado() or puede_escribir()));
-- Los cambios de estado van por las funciones de abajo; el superadministrador corrige.
create policy solicitudes_vacaciones_update on solicitudes_vacaciones for update using (es_superadmin()) with check (es_superadmin());

-- Aprobar (crea la ausencia de vacaciones, que descuenta los días) o rechazar: solo la dirección.
create or replace function resolver_vacaciones(p_id uuid, p_aprobar boolean, p_respuesta text default null) returns void
language plpgsql security definer set search_path = public as $$
declare s solicitudes_vacaciones; v_ausencia uuid;
begin
  if not es_admin() then
    raise exception 'Solo la dirección puede aprobar o rechazar vacaciones.' using errcode = '42501';
  end if;
  select * into s from solicitudes_vacaciones where id = p_id for update;
  if s.id is null then raise exception 'La solicitud no existe.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Esta solicitud ya está %.', s.estado; end if;
  if not p_aprobar and nullif(trim(p_respuesta), '') is null then
    raise exception 'Para rechazar escriba el motivo (lo verá la persona).';
  end if;
  if p_aprobar then
    insert into ausencias (empleado_id, tipo, desde, hasta, dias_habiles, aprobado_por, observaciones)
    values (s.empleado_id, 'vacaciones', s.desde, s.hasta, s.dias_habiles, usuario_actual(), coalesce(nullif(trim(p_respuesta), ''), 'Solicitud de vacaciones aprobada'))
    returning id into v_ausencia;
  end if;
  update solicitudes_vacaciones
  set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
      resuelta_por = usuario_actual(), resuelta_en = now(), respuesta = nullif(trim(p_respuesta), ''), ausencia_id = v_ausencia
  where id = p_id;
end $$;

-- Anular una solicitud pendiente: la misma persona o la dirección.
create or replace function anular_solicitud_vacaciones(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s solicitudes_vacaciones;
begin
  select * into s from solicitudes_vacaciones where id = p_id for update;
  if s.id is null or not (s.empleado_id = mi_empleado() or es_admin()) then
    raise exception 'No tiene permiso para anular esta solicitud.' using errcode = '42501';
  end if;
  if s.estado <> 'pendiente' then raise exception 'Solo se anula una solicitud pendiente (esta ya está %).', s.estado; end if;
  update solicitudes_vacaciones set estado = 'anulada', resuelta_por = usuario_actual(), resuelta_en = now() where id = p_id;
end $$;

-- migrate:down

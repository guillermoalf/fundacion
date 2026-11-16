-- migrate:up
-- =====================================================================
-- Fundación Creciendo Feliz — Portal administrativo
-- Migración 1: esquema base
--   Activos (placas, ubicación, depreciación), compras/facturas,
--   inventario de consumibles (kardex), personal, asistencia,
--   ausencias, planilla, parámetros legales y bitácora de auditoría.
-- Principio: nada se borra. Todo cambio queda en bitácora con usuario y fecha.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type rol_portal as enum ('admin', 'contabilidad', 'coordinacion', 'auditor');
create type metodo_depreciacion as enum ('linea_recta', 'suma_digitos');
create type estado_activo as enum ('en_uso', 'en_reparacion', 'en_bodega', 'extraviado', 'dado_de_baja');
create type tipo_mov_activo as enum ('alta', 'traslado', 'reparacion', 'retorno', 'baja', 'ajuste');
create type tipo_linea_compra as enum ('activo', 'consumible', 'servicio');
create type categoria_producto as enum ('perecedero', 'no_perecedero', 'limpieza', 'didactico', 'oficina', 'otro');
create type tipo_mov_inventario as enum ('entrada', 'salida', 'merma', 'ajuste');
create type tipo_marca as enum ('entrada', 'salida');
create type origen_marca as enum ('kiosko', 'hoja_firmada', 'manual');
create type tipo_ausencia as enum (
  'vacaciones', 'incapacidad_ccss', 'incapacidad_ins', 'licencia_maternidad',
  'permiso_con_goce', 'permiso_sin_goce', 'ausencia_injustificada', 'feriado'
);
create type estado_planilla as enum ('borrador', 'aprobada', 'pagada', 'anulada');

-- ---------------------------------------------------------------------
-- Usuarios del portal (solo administración del kinder)
-- ---------------------------------------------------------------------
create table perfiles (
  id uuid primary key references usuarios(id) on delete restrict,
  nombre text not null,
  rol rol_portal not null default 'coordinacion',
  activo boolean not null default true,
  -- acceso temporal para revisores de PANI / IMAS / JPS (solo lectura)
  acceso_hasta date,
  creado_en timestamptz not null default now()
);

create or replace function rol_actual() returns rol_portal
language sql stable security definer set search_path = public as $$
  select rol from perfiles
  where id = usuario_actual() and activo
    and (acceso_hasta is null or acceso_hasta >= current_date)
$$;

create or replace function puede_leer() returns boolean
language sql stable as $$ select rol_actual() is not null $$;

create or replace function puede_escribir() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad', 'coordinacion') $$;

create or replace function es_admin() returns boolean
language sql stable as $$ select rol_actual() = 'admin' $$;

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------
create table fuentes_financiamiento (
  id smallserial primary key,
  codigo text unique not null,          -- PANI, IMAS, JPS, PROPIOS, DONACION
  nombre text not null,
  programa text,                        -- ej. "Fundación Creciendo Feliz ABC"
  activo boolean not null default true
);

create table ubicaciones (
  id smallserial primary key,
  nombre text unique not null,          -- Aula 1 After II, Cocina, Oficina...
  tipo text not null default 'aula',    -- aula, area_comun, bodega, oficina, exterior
  responsable_id uuid,                  -- FK a empleados (se agrega abajo)
  activo boolean not null default true
);

-- Anexo 2 del Reglamento de la Ley del Impuesto sobre la Renta
create table categorias_activo (
  id smallserial primary key,
  nombre text unique not null,
  tasa_anual numeric(5,2) not null check (tasa_anual > 0 and tasa_anual <= 100),
  anios_vida smallint not null check (anios_vida > 0),
  -- fila del Anexo 2 (Reglamento Ley Impuesto sobre la Renta) de donde sale la tasa.
  -- La directora puede agregar filas desde el portal; cambiar una tasa queda en bitácora.
  referencia text not null default 'Anexo 2 RLISR',
  palabras_clave text[] not null default '{}'   -- para sugerir la categoría al importar
);

create table proveedores (
  id serial primary key,
  nombre text not null,
  cedula_juridica text unique,
  tipo text,                            -- supermercado, carnes, frutas_verduras, limpieza, tecnologia...
  telefono text,
  correo text,
  es_habitual boolean not null default true,
  activo boolean not null default true,
  notas text
);

-- ---------------------------------------------------------------------
-- Personal (todos los empleados, usen o no el portal)
-- ---------------------------------------------------------------------
create table empleados (
  id uuid primary key default gen_random_uuid(),
  cedula text unique not null,
  nombre text not null,
  puesto text not null,
  ubicacion_id smallint references ubicaciones(id),   -- aula a cargo
  fuente_id smallint references fuentes_financiamiento(id), -- quién financia su salario
  fecha_ingreso date not null,
  fecha_salida date,
  salario_mensual numeric(12,2) not null check (salario_mensual >= 0),
  horas_jornada_diaria numeric(4,2) not null default 8,
  -- PIN de 4 dígitos para marcar en la tablet de la entrada (se guarda con hash)
  pin_hash text,
  perfil_id uuid references perfiles(id),             -- solo si usa el portal
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table ubicaciones add constraint ubicaciones_responsable_fk
  foreign key (responsable_id) references empleados(id);

create table horarios (
  id serial primary key,
  empleado_id uuid not null references empleados(id),
  dia_semana smallint not null check (dia_semana between 1 and 7), -- 1 = lunes
  hora_entrada time not null,
  hora_salida time not null,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  unique (empleado_id, dia_semana, vigente_desde)
);

-- ---------------------------------------------------------------------
-- Compras / facturas
-- ---------------------------------------------------------------------
create table compras (
  id uuid primary key default gen_random_uuid(),
  proveedor_id int not null references proveedores(id),
  fuente_id smallint not null references fuentes_financiamiento(id),
  numero_factura text not null,
  fecha date not null,
  subtotal numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  factura_url text,                     -- foto o PDF de la factura (almacenamiento de archivos, por definir)
  observaciones text,
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  unique (proveedor_id, numero_factura)
);

create table compra_lineas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id),
  tipo tipo_linea_compra not null,
  descripcion text not null,
  producto_id int,                      -- si es consumible (FK abajo)
  cantidad numeric(12,3) not null check (cantidad > 0),
  unidad text not null default 'unidad',
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0),
  total_linea numeric(14,2) generated always as (round(cantidad * precio_unitario, 2)) stored
);

-- ---------------------------------------------------------------------
-- Activos fijos
-- ---------------------------------------------------------------------
create table activos (
  id uuid primary key default gen_random_uuid(),
  placa text,                           -- puede faltar al migrar; se muestra como alerta
  tipo_bien text not null,
  marca text,
  modelo text,
  serie text,
  categoria_id smallint references categorias_activo(id),
  ubicacion_id smallint not null references ubicaciones(id),
  fuente_id smallint not null references fuentes_financiamiento(id),
  compra_linea_id uuid references compra_lineas(id),
  -- Si falta fecha o costo el activo existe igual; depreciación y valor en libros quedan vacíos.
  fecha_adquisicion date,
  costo numeric(14,2) check (costo >= 0),
  unidades_compra int check (unidades_compra > 0), -- si el costo de la factura cubría varias unidades
  origen text not null default 'formulario' check (origen in ('formulario','importacion')),
  fila_origen text,                     -- archivo y fila del Excel migrado
  valor_residual numeric(14,2) not null default 0 check (valor_residual >= 0),
  metodo metodo_depreciacion not null default 'linea_recta',
  -- si se deja null se usa la tasa de la categoría
  tasa_anual_override numeric(5,2),
  estado estado_activo not null default 'en_uso',
  fecha_baja date,
  motivo_baja text,
  foto_url text,
  notas text,
  creado_en timestamptz not null default now(),
  check (valor_residual <= costo),
  check ((estado = 'dado_de_baja') = (fecha_baja is not null))
);
create index on activos (ubicacion_id);
create index on activos (placa);

-- Placa única para todo lo que se registra en el portal. Lo importado puede traer
-- duplicados históricos: entra igual y aparece en v_activos_alertas hasta corregirlo.
create or replace function validar_placa_unica() returns trigger language plpgsql as $$
begin
  if new.placa is not null and new.origen = 'formulario' and exists (
       select 1 from activos where placa = new.placa and id <> new.id and estado <> 'dado_de_baja') then
    raise exception 'La placa % ya está asignada a otro activo', new.placa;
  end if;
  return new;
end $$;
create trigger activos_placa_unica before insert or update of placa on activos
  for each row execute function validar_placa_unica();
create index on activos (fuente_id);

create table activo_movimientos (
  id uuid primary key default gen_random_uuid(),
  activo_id uuid not null references activos(id),
  tipo tipo_mov_activo not null,
  fecha date not null default current_date,
  ubicacion_origen_id smallint references ubicaciones(id),
  ubicacion_destino_id smallint references ubicaciones(id),
  motivo text not null,
  documento_url text,                   -- acta, boleta de reparación, etc.
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now()
);

-- Toma física por aula: la responsable confirma qué está y qué falta
create table conteos_fisicos (
  id uuid primary key default gen_random_uuid(),
  ubicacion_id smallint not null references ubicaciones(id),
  fecha date not null default current_date,
  responsable_id uuid not null references empleados(id),
  realizado_por uuid references perfiles(id) default usuario_actual(),
  acta_firmada_url text,                -- foto del acta firmada por la responsable
  observaciones text,
  cerrado boolean not null default false
);
create table conteo_detalle (
  conteo_id uuid not null references conteos_fisicos(id),
  activo_id uuid not null references activos(id),
  encontrado boolean not null,
  estado_observado text,
  nota text,
  primary key (conteo_id, activo_id)
);

-- ---------------------------------------------------------------------
-- Inventario de consumibles (alimentos, limpieza, etc.) — kardex
-- ---------------------------------------------------------------------
create table productos (
  id serial primary key,
  nombre text not null,
  categoria categoria_producto not null,
  unidad text not null,                 -- kg, litro, paquete, unidad...
  proveedor_habitual_id int references proveedores(id),
  codigo_proveedor text,                -- ej. código PriceSmart
  stock_minimo numeric(12,3) not null default 0,
  activo boolean not null default true,
  unique (nombre, unidad)
);
alter table compra_lineas add constraint compra_lineas_producto_fk
  foreign key (producto_id) references productos(id);
alter table compra_lineas add constraint consumible_con_producto
  check (tipo <> 'consumible' or producto_id is not null);

create table inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id int not null references productos(id),
  tipo tipo_mov_inventario not null,
  cantidad numeric(12,3) not null check (cantidad > 0),
  fecha date not null default current_date,
  compra_linea_id uuid references compra_lineas(id),
  fecha_vencimiento date,               -- perecederos
  entregado_a text,                     -- p. ej. cocinera / encargada de limpieza
  motivo text,
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  check (tipo <> 'entrada' or compra_linea_id is not null or motivo is not null)
);
create index on inventario_movimientos (producto_id, fecha);

create view v_saldo_inventario as
select p.id as producto_id, p.nombre, p.categoria, p.unidad, p.stock_minimo,
       coalesce(sum(case when m.tipo = 'entrada' then m.cantidad
                         when m.tipo = 'ajuste' then m.cantidad
                         else -m.cantidad end), 0) as saldo
from productos p
left join inventario_movimientos m on m.producto_id = p.id
group by p.id;

-- ---------------------------------------------------------------------
-- Asistencia, ausencias y planilla
-- ---------------------------------------------------------------------
create table marcas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id),
  tipo tipo_marca not null,
  marcado_en timestamptz not null default now(),
  origen origen_marca not null,
  registrado_por uuid references perfiles(id),   -- null cuando viene del kiosko
  motivo_manual text,
  check (origen = 'kiosko' or motivo_manual is not null)
);
create index on marcas (empleado_id, marcado_en);

create table ausencias (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id),
  tipo tipo_ausencia not null,
  desde date not null,
  hasta date not null,
  dias_habiles numeric(5,2) not null check (dias_habiles >= 0),
  numero_boleta text,                   -- boleta de incapacidad CCSS / INS
  documento_url text,
  aprobado_por uuid references perfiles(id) default usuario_actual(),
  observaciones text,
  creado_en timestamptz not null default now(),
  check (hasta >= desde),
  check (tipo not in ('incapacidad_ccss', 'incapacidad_ins', 'licencia_maternidad') or numero_boleta is not null)
);

create table planillas (
  id uuid primary key default gen_random_uuid(),
  periodo_inicio date not null,
  periodo_fin date not null,
  tipo text not null default 'mensual',  -- mensual, quincenal, aguinaldo
  estado estado_planilla not null default 'borrador',
  aprobada_por uuid references perfiles(id),
  aprobada_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (periodo_inicio, periodo_fin, tipo)
);

create table planilla_lineas (
  planilla_id uuid not null references planillas(id),
  empleado_id uuid not null references empleados(id),
  fuente_id smallint references fuentes_financiamiento(id),
  salario_base numeric(12,2) not null,
  dias_laborados numeric(5,2) not null,
  horas_extra numeric(6,2) not null default 0,
  monto_horas_extra numeric(12,2) not null default 0,
  rebajo_ausencias numeric(12,2) not null default 0,
  rebajo_tardias numeric(12,2) not null default 0,
  pago_incapacidad_patrono numeric(12,2) not null default 0,
  salario_bruto numeric(12,2) not null,
  ccss_obrero numeric(12,2) not null,
  impuesto_renta numeric(12,2) not null default 0,
  otras_deducciones numeric(12,2) not null default 0,
  salario_neto numeric(12,2) not null,
  cargas_patronales numeric(12,2) not null,
  provision_aguinaldo numeric(12,2) not null,
  provision_vacaciones numeric(12,2) not null,
  detalle jsonb not null default '{}',
  primary key (planilla_id, empleado_id)
);

-- ---------------------------------------------------------------------
-- Parámetros con vigencia (tasas CCSS, salario base, tolerancia, etc.)
-- Nunca se sobreescriben: se agrega una fila con nueva vigencia.
-- ---------------------------------------------------------------------
create table parametros (
  clave text not null,
  valor numeric not null,
  vigente_desde date not null,
  fuente_legal text,
  primary key (clave, vigente_desde)
);

create or replace function parametro(p_clave text, p_fecha date default current_date)
returns numeric language sql stable as $$
  select valor from parametros
  where clave = p_clave and vigente_desde <= p_fecha
  order by vigente_desde desc limit 1
$$;

-- ---------------------------------------------------------------------
-- Depreciación (misma lógica que src/lib/calculos/depreciacion.ts)
-- Convención: se deprecia desde el mes siguiente a la adquisición,
-- prorrateado por meses (art. del Reglamento: primer y último año proporcionales).
-- ---------------------------------------------------------------------
create or replace function meses_depreciados(p_adq date, p_corte date)
returns int language sql immutable as $$
  select greatest(0, (extract(year from p_corte)::int - extract(year from p_adq)::int) * 12
                    + (extract(month from p_corte)::int - extract(month from p_adq)::int))
$$;

create or replace function depreciacion_acumulada(
  p_costo numeric, p_residual numeric, p_tasa numeric, p_anios int,
  p_metodo metodo_depreciacion, p_adq date, p_corte date
) returns numeric language plpgsql immutable as $$
declare
  base numeric := p_costo - coalesce(p_residual, 0);
  m int;
  suma numeric; acum numeric := 0; anio int; meses_anio int;
begin
  -- Sin costo, fecha o categoría no hay cálculo: el campo queda vacío (no se inventa un valor)
  if p_costo is null or p_adq is null or p_tasa is null then return null; end if;
  m := meses_depreciados(p_adq, p_corte);
  if base <= 0 or m = 0 then return 0; end if;
  if p_metodo = 'linea_recta' then
    return round(least(base, base * p_tasa / 100 * m / 12), 2);
  end if;
  -- suma de los dígitos de los años
  suma := p_anios * (p_anios + 1) / 2.0;
  for anio in 1..p_anios loop
    exit when m <= 0;
    meses_anio := least(12, m);
    acum := acum + base * (p_anios - anio + 1) / suma * meses_anio / 12;
    m := m - meses_anio;
  end loop;
  return round(least(base, acum), 2);
end $$;

create or replace function activos_al_corte(p_corte date, p_fuente text default null)
returns table (
  activo_id uuid, placa text, tipo_bien text, marca text, modelo text, serie text,
  ubicacion text, fuente text, fecha_adquisicion date, costo numeric,
  categoria text, tasa_anual numeric, depreciacion_acumulada numeric, valor_libros numeric
) language sql stable as $$
  select a.id, a.placa, a.tipo_bien, a.marca, a.modelo, a.serie,
         u.nombre, f.codigo, a.fecha_adquisicion, a.costo, c.nombre,
         coalesce(a.tasa_anual_override, c.tasa_anual),
         d.dep, a.costo - d.dep
  from activos a
  join ubicaciones u on u.id = a.ubicacion_id
  join fuentes_financiamiento f on f.id = a.fuente_id
  left join categorias_activo c on c.id = a.categoria_id
  cross join lateral (
    select depreciacion_acumulada(a.costo, a.valor_residual,
             coalesce(a.tasa_anual_override, c.tasa_anual), c.anios_vida, a.metodo,
             a.fecha_adquisicion, least(p_corte, coalesce(a.fecha_baja, p_corte))) as dep
  ) d
  where (a.fecha_adquisicion is null or a.fecha_adquisicion <= p_corte)
    and (a.fecha_baja is null or a.fecha_baja > p_corte)
    and (p_fuente is null or f.codigo = p_fuente)
  order by u.nombre, a.placa
$$;

-- Lo que le falta a cada activo para quedar completo (se muestra en el portal y antes de exportar)
create or replace view v_activos_alertas as
select a.id as activo_id, a.placa, a.tipo_bien, u.nombre as ubicacion, x.alerta
from activos a
join ubicaciones u on u.id = a.ubicacion_id
cross join lateral (
  select 'Sin placa' where a.placa is null
  union all select 'Placa repetida en otro activo' where a.placa is not null and exists (
    select 1 from activos b where b.placa = a.placa and b.id <> a.id and b.estado <> 'dado_de_baja')
  union all select 'Sin fecha de adquisición' where a.fecha_adquisicion is null
  union all select 'Sin costo de adquisición' where a.costo is null
  union all select 'Sin categoría de depreciación' where a.categoria_id is null
  union all select 'Sin factura adjunta' where a.compra_linea_id is null
  union all select 'Serie repetida en otro activo' where coalesce(a.serie,'') not in ('', 'NO INDICA') and exists (
    select 1 from activos b where b.serie = a.serie and b.id <> a.id)
) x(alerta)
where a.estado <> 'dado_de_baja';

-- ---------------------------------------------------------------------
-- Bitácora de auditoría (insert-only, la llenan los triggers)
-- ---------------------------------------------------------------------
create table bitacora (
  id bigserial primary key,
  tabla text not null,
  registro_id text not null,
  accion text not null,                 -- INSERT / UPDATE / DELETE
  antes jsonb,
  despues jsonb,
  usuario uuid default usuario_actual(),
  en timestamptz not null default now()
);
create index on bitacora (tabla, registro_id);

create or replace function registrar_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  rid := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)::text);
  insert into bitacora (tabla, registro_id, accion, antes, despues)
  values (tg_table_name, rid, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- Prohibir DELETE en tablas con valor de auditoría: se usan estados (baja, anulada, activo=false)
create or replace function bloquear_delete() returns trigger language plpgsql as $$
begin
  raise exception 'No se permite eliminar registros de %. Use un estado (baja / anulado / inactivo).', tg_table_name;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfiles','fuentes_financiamiento','ubicaciones','categorias_activo','proveedores',
    'empleados','horarios','compras','compra_lineas','activos','activo_movimientos',
    'conteos_fisicos','conteo_detalle','productos','inventario_movimientos','marcas',
    'ausencias','planillas','planilla_lineas','parametros'
  ] loop
    execute format('create trigger %I_bitacora after insert or update or delete on %I
                    for each row execute function registrar_bitacora()', t, t);
    execute format('create trigger %I_no_delete before delete on %I
                    for each row execute function bloquear_delete()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_lectura on %I for select using (puede_leer())', t, t);
    execute format('create policy %I_insert on %I for insert with check (puede_escribir())', t, t);
    execute format('create policy %I_update on %I for update using (puede_escribir()) with check (puede_escribir())', t, t);
  end loop;
end $$;

-- Montos de planilla y usuarios: solo admin/contabilidad
drop policy planillas_update on planillas;
create policy planillas_update on planillas for update
  using (rol_actual() in ('admin','contabilidad')) with check (rol_actual() in ('admin','contabilidad'));
drop policy planilla_lineas_insert on planilla_lineas;
create policy planilla_lineas_insert on planilla_lineas for insert
  with check (rol_actual() in ('admin','contabilidad'));
drop policy planilla_lineas_update on planilla_lineas;
create policy planilla_lineas_update on planilla_lineas for update
  using (rol_actual() in ('admin','contabilidad')) with check (rol_actual() in ('admin','contabilidad'));
drop policy perfiles_insert on perfiles;
create policy perfiles_insert on perfiles for insert with check (es_admin());
drop policy perfiles_update on perfiles;
create policy perfiles_update on perfiles for update using (es_admin()) with check (es_admin());
drop policy parametros_insert on parametros;
create policy parametros_insert on parametros for insert with check (rol_actual() in ('admin','contabilidad'));
drop policy parametros_update on parametros;
create policy parametros_update on parametros for update using (false);
drop policy marcas_update on marcas;
create policy marcas_update on marcas for update using (false);   -- una marca no se edita: se registra otra con motivo

alter table bitacora enable row level security;
create policy bitacora_lectura on bitacora for select using (rol_actual() in ('admin','auditor','contabilidad'));
create trigger bitacora_no_delete before delete on bitacora for each row execute function bloquear_delete();
create policy bitacora_sin_update on bitacora for update using (false);

-- migrate:down

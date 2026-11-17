-- migrate:up
-- Salarios y planilla: solo dirección, contabilidad y auditoría los ven. Coordinación no.
-- El RLS es por fila y todo el portal usa el mismo rol (app_portal), así que el salario no puede quedar
-- como columna de `empleados` (que coordinación sí lee): pasa a su propia tabla, con historial por vigencia.

create or replace function ve_salarios() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad', 'auditor') $$;
create or replace function edita_salarios() returns boolean
language sql stable as $$ select rol_actual() in ('admin', 'contabilidad') $$;

create table salarios (
  empleado_id uuid not null references empleados(id),
  salario_mensual numeric(12,2) not null check (salario_mensual >= 0),
  vigente_desde date not null,
  motivo text,
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  primary key (empleado_id, vigente_desde)
);
create trigger salarios_bitacora after insert or update or delete on salarios for each row execute function registrar_bitacora();
create trigger salarios_no_delete before delete on salarios for each row execute function bloquear_delete();
alter table salarios enable row level security;
create policy salarios_lectura on salarios for select using (ve_salarios());
create policy salarios_insert on salarios for insert with check (edita_salarios());
create policy salarios_update on salarios for update using (edita_salarios()) with check (edita_salarios());

insert into salarios (empleado_id, salario_mensual, vigente_desde, motivo)
select id, salario_mensual, fecha_ingreso, 'Salario registrado antes de separar los salarios' from empleados;
alter table empleados drop column salario_mensual;

-- Salario vigente a una fecha (null si no hay o si quien consulta no puede ver salarios).
create or replace function salario_vigente(p_empleado uuid, p_fecha date default current_date) returns numeric
language sql stable as $$
  select salario_mensual from salarios where empleado_id = p_empleado and vigente_desde <= p_fecha
  order by vigente_desde desc limit 1
$$;

-- Planilla: lectura solo para quien ve salarios; crear y editar, admin y contabilidad.
drop policy planillas_lectura on planillas;
create policy planillas_lectura on planillas for select using (ve_salarios());
drop policy planillas_insert on planillas;
create policy planillas_insert on planillas for insert with check (edita_salarios());
drop policy planilla_lineas_lectura on planilla_lineas;
create policy planilla_lineas_lectura on planilla_lineas for select using (ve_salarios());

-- La bitácora de empleados ya no lleva salarios nuevos; las filas viejas de empleados en la bitácora
-- tenían el salario, pero la bitácora solo la leen admin, contabilidad y auditoría.

-- migrate:down

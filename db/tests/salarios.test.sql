-- Salarios y planilla: coordinación no los ve ni los toca; auditoría los ve; contabilidad los edita.
begin;
create extension if not exists pgtap;
select plan(10);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000c1', 'conta@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000c1', 'Contabilidad', 'contabilidad', null),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion', null),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor', current_date + 5);
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso) values ('00000000-0000-0000-0000-00000000e001', '6-6666-6666', 'Prueba', 'Docente', '2024-01-08');
insert into salarios (empleado_id, salario_mensual, vigente_desde) values ('00000000-0000-0000-0000-00000000e001', 450000, '2024-01-08');
insert into planillas (id, periodo_inicio, periodo_fin) values ('00000000-0000-0000-0000-0000000000f1', '2031-01-01', '2031-01-31');
insert into planilla_lineas (planilla_id, empleado_id, salario_base, dias_laborados, salario_bruto, ccss_obrero, salario_neto, cargas_patronales, provision_aguinaldo, provision_vacaciones)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 450000, 30, 450000, 1, 1, 1, 1, 1);

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select is((select count(*) from salarios where empleado_id = '00000000-0000-0000-0000-00000000e001'), 0::bigint, 'coordinación no ve salarios');
select is(salario_vigente('00000000-0000-0000-0000-00000000e001'), null, 'ni por la función del salario vigente');
select is((select count(*) from planillas where id = '00000000-0000-0000-0000-0000000000f1'), 0::bigint, 'coordinación no ve planillas');
select is((select count(*) from planilla_lineas where planilla_id = '00000000-0000-0000-0000-0000000000f1'), 0::bigint, 'ni sus líneas');
select throws_ok($$insert into planillas (periodo_inicio, periodo_fin) values ('2031-02-01', '2031-02-28')$$, '42501', null, 'coordinación no crea planillas');
select throws_ok($$insert into salarios (empleado_id, salario_mensual, vigente_desde) values ('00000000-0000-0000-0000-00000000e001', 1, '2031-01-01')$$, '42501', null, 'coordinación no pone salarios');
select ok(exists(select 1 from empleados where id = '00000000-0000-0000-0000-00000000e001'), 'coordinación sí ve al personal (sin salario)');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select is(salario_vigente('00000000-0000-0000-0000-00000000e001'), 450000::numeric, 'auditoría ve el salario');
select throws_ok($$insert into salarios (empleado_id, salario_mensual, vigente_desde) values ('00000000-0000-0000-0000-00000000e001', 1, '2031-01-01')$$, '42501', null, 'auditoría no lo cambia');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000c1';
select lives_ok($$insert into salarios (empleado_id, salario_mensual, vigente_desde, motivo) values ('00000000-0000-0000-0000-00000000e001', 480000, '2031-01-01', 'Aumento')$$, 'contabilidad registra un aumento');

select * from finish();
rollback;

-- Planilla: aprobación por admin/contabilidad, montos congelados al aprobar, estados en orden.
begin;
create extension if not exists pgtap;
select plan(9);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000c1', 'conta@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000c1', 'Contabilidad', 'contabilidad'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso, salario_mensual)
  values ('00000000-0000-0000-0000-00000000e001', '8-8888-8888', 'Prueba', 'Docente', '2024-01-08', 450000);
insert into planillas (id, periodo_inicio, periodo_fin, tipo) values ('00000000-0000-0000-0000-0000000000f1', '2030-01-01', '2030-01-31', 'mensual');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select throws_ok($$insert into planilla_lineas (planilla_id, empleado_id, salario_base, dias_laborados, salario_bruto, ccss_obrero, salario_neto, cargas_patronales, provision_aguinaldo, provision_vacaciones)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 1, 30, 1, 0, 1, 0, 0, 0)$$, '42501', null, 'coordinación no pone montos de planilla');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000c1';
select lives_ok($$insert into planilla_lineas (planilla_id, empleado_id, salario_base, dias_laborados, salario_bruto, ccss_obrero, salario_neto, cargas_patronales, provision_aguinaldo, provision_vacaciones)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 450000, 30, 450000, 48735, 401265, 120735, 37500, 12500)$$, 'contabilidad arma la planilla en borrador');
select throws_like($$update planillas set estado = 'pagada' where id = '00000000-0000-0000-0000-0000000000f1'$$, '%Primero hay que aprobar%', 'no se paga sin aprobar');
select lives_ok($$update planillas set estado = 'aprobada' where id = '00000000-0000-0000-0000-0000000000f1'$$, 'contabilidad aprueba');
select is((select aprobada_por from planillas where id = '00000000-0000-0000-0000-0000000000f1'), '00000000-0000-0000-0000-0000000000c1'::uuid, 'queda quién aprobó');
select throws_like($$update planilla_lineas set salario_neto = 1 where planilla_id = '00000000-0000-0000-0000-0000000000f1'$$, '%ya no está en borrador%', 'aprobada, sus montos no cambian');
select throws_like($$update planillas set estado = 'borrador' where id = '00000000-0000-0000-0000-0000000000f1'$$, '%ya está aprobada%', 'no vuelve a borrador');
select lives_ok($$update planillas set estado = 'pagada' where id = '00000000-0000-0000-0000-0000000000f1'$$, 'se marca pagada');
select throws_like($$update planillas set estado = 'anulada' where id = '00000000-0000-0000-0000-0000000000f1'$$, '%ya está pagada%', 'una pagada ya no cambia');

select * from finish();
rollback;

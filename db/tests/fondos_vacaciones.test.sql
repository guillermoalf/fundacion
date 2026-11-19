-- Salario pagado por varios fondos y solicitudes de vacaciones.
begin;
create extension if not exists pgtap;
select plan(12);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'maestra@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'otra@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion'),
  ('00000000-0000-0000-0000-0000000000e1', 'Maestra', 'personal'),
  ('00000000-0000-0000-0000-0000000000e2', 'Otra', 'personal');
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso, perfil_id) values
  ('00000000-0000-0000-0000-00000000ee01', 'pgtap-1', 'Maestra pgtap', 'Docente', '2025-01-06', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-00000000ee02', 'pgtap-2', 'Otra pgtap', 'Asistente', '2025-01-06', '00000000-0000-0000-0000-0000000000e2');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$insert into salario_aportes (empleado_id, vigente_desde, fuente_id, monto) values
  ('00000000-0000-0000-0000-00000000ee01', '2026-01-01', 1, 500000), ('00000000-0000-0000-0000-00000000ee01', '2026-01-01', 2, null)$$,
  'un salario se reparte: PANI un monto fijo e IMAS el resto');
select throws_ok($$insert into salario_aportes (empleado_id, vigente_desde, fuente_id, monto) values ('00000000-0000-0000-0000-00000000ee01', '2026-01-01', 3, null)$$,
  '23505', null, 'solo un fondo paga «el resto»');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select is((select count(*)::int from salario_aportes where empleado_id = '00000000-0000-0000-0000-00000000ee01'), 0, 'coordinación no ve los montos');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from empleados), 1, 'una maestra ve solo su propia ficha');
select lives_ok($$insert into solicitudes_vacaciones (id, empleado_id, desde, hasta, dias_habiles) values
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-00000000ee01', '2026-12-21', '2026-12-23', 3)$$, 'y solicita sus vacaciones');
select throws_ok($$insert into solicitudes_vacaciones (empleado_id, desde, hasta, dias_habiles) values
  ('00000000-0000-0000-0000-00000000ee02', '2026-12-21', '2026-12-23', 3)$$, '42501', null, 'pero no a nombre de otra persona');
select throws_ok($$select resolver_vacaciones('00000000-0000-0000-0000-00000000ab01', true)$$, '42501', null, 'ni se las aprueba ella misma');
select ok(parametro('vacaciones_dias_habiles_anuales') is not null, 've cuántos días de vacaciones se ganan por año');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e2';
select is((select count(*)::int from solicitudes_vacaciones), 0, 'otra empleada no ve solicitudes ajenas');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select throws_ok($$select resolver_vacaciones('00000000-0000-0000-0000-00000000ab01', false, '')$$, 'P0001', null, 'para rechazar hay que dar el motivo');
select resolver_vacaciones('00000000-0000-0000-0000-00000000ab01', true, null);
select is((select a.dias_habiles from ausencias a join solicitudes_vacaciones s on s.ausencia_id = a.id where s.id = '00000000-0000-0000-0000-00000000ab01'), 3.00::numeric,
  'al aprobarla se registran las vacaciones y se descuentan los días');
select throws_ok($$select anular_solicitud_vacaciones('00000000-0000-0000-0000-00000000ab01')$$, 'P0001', null, 'una solicitud aprobada ya no se anula');

select * from finish();
rollback;

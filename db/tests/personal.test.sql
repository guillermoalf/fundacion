-- PIN del personal: nadie lo lee desde el portal; solo quien puede escribir lo asigna.
begin;
create extension if not exists pgtap;
select plan(6);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion', null),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor', current_date + 5);
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso)
  values ('00000000-0000-0000-0000-00000000e001', '1-1111-1111', 'Maestra Prueba', 'Docente', '2024-01-08');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select throws_ok($$select asignar_pin_empleado('00000000-0000-0000-0000-00000000e001', 'h')$$, '42501', null, 'el auditor no asigna PIN');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select lives_ok($$select asignar_pin_empleado('00000000-0000-0000-0000-00000000e001', 'hash-1')$$, 'coordinación asigna un PIN');
select lives_ok($$select asignar_pin_empleado('00000000-0000-0000-0000-00000000e001', 'hash-2')$$, 'y lo puede cambiar');
select throws_ok($$select * from empleados_pin$$, '42501', null, 'nadie lee los PIN desde el portal');
select ok('00000000-0000-0000-0000-00000000e001'::uuid in (select empleados_con_pin()), 'se puede saber quién tiene PIN');
reset role;
select is((select pin_hash from empleados_pin where empleado_id = '00000000-0000-0000-0000-00000000e001'), 'hash-2', 'queda el último PIN');

select * from finish();
rollback;

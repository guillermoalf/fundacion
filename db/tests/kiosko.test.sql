-- Kiosko: solo admin registra tablets; nadie del portal ve los intentos; una marca de kiosko exige tablet.
begin;
create extension if not exists pgtap;
select plan(6);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso)
  values ('00000000-0000-0000-0000-00000000e001', '9-9999-9999', 'Prueba', 'Docente', '2024-01-08');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select throws_ok($$insert into dispositivos_kiosko (nombre, token_hash) values ('Tablet', 'x')$$, '42501', null, 'coordinación no registra tablets');
select throws_ok($$select * from intentos_pin$$, '42501', null, 'nadie del portal ve los intentos de PIN');
select throws_ok($$insert into marcas (empleado_id, tipo, origen) values ('00000000-0000-0000-0000-00000000e001', 'entrada', 'kiosko')$$,
  '23514', null, 'una marca de kiosko necesita la tablet');
select lives_ok($$insert into marcas (empleado_id, tipo, origen, motivo_manual) values ('00000000-0000-0000-0000-00000000e001', 'entrada', 'hoja_firmada', 'Hoja del lunes')$$,
  'coordinación digita una marca de la hoja firmada');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$insert into dispositivos_kiosko (nombre, token_hash) values ('Tablet entrada', 'hash-pgtap')$$, 'admin registra una tablet');
reset role;
select is((select registrado_por from marcas where motivo_manual = 'Hoja del lunes'), '00000000-0000-0000-0000-0000000000d1'::uuid, 'la marca manual guarda quién la digitó');

select * from finish();
rollback;

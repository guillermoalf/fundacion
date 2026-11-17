-- Archivos adjuntos: permisos por rol, sin edición ni borrado, bitácora sin el contenido.
begin;
create extension if not exists pgtap;
select plan(7);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion', null),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor', current_date + 5);

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select lives_ok($$insert into archivos (id, nombre, tipo, tamano, contenido)
  values ('00000000-0000-0000-0000-00000000aaa1', 'factura.jpg', 'image/jpeg', 3, '\x010203')$$, 'coordinación sube un archivo');
select throws_ok($$insert into archivos (nombre, tipo, tamano, contenido) values ('x.exe', 'application/x-msdownload', 1, '\x01')$$,
  '23514', null, 'solo fotos y PDF');
select is_empty($$update archivos set nombre = 'otro' returning id$$, 'un archivo no se edita');
select throws_ok($$delete from archivos$$, '42501', null, 'un archivo no se borra');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select is((select nombre from archivos where id = '00000000-0000-0000-0000-00000000aaa1'), 'factura.jpg', 'el auditor ve el archivo');
select throws_ok($$insert into archivos (nombre, tipo, tamano, contenido) values ('a.pdf', 'application/pdf', 1, '\x01')$$,
  '42501', null, 'el auditor no sube archivos');

reset role;
select ok((select not (despues ? 'contenido') and despues->>'nombre' = 'factura.jpg' from bitacora where tabla = 'archivos' and registro_id = '00000000-0000-0000-0000-00000000aaa1'),
  'la bitácora guarda el archivo sin su contenido');

select * from finish();
rollback;

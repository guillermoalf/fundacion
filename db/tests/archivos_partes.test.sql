-- Subida por partes: se arma completa, a nombre de quien sube; tope de 5 MB; el espacio solo lo ve admin.
begin;
create extension if not exists pgtap;
select plan(7);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000a1', 'Super', 'superadmin', null),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion', null),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor', current_date + 5);

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
insert into archivos_partes (subida_id, parte, contenido) values ('00000000-0000-0000-0000-0000000005b1', 0, '\x0102'), ('00000000-0000-0000-0000-0000000005b1', 1, '\x03');
select throws_ok($$select completar_archivo('00000000-0000-0000-0000-0000000005b2', 'x.pdf', 'application/pdf')$$, 'P0001', null, 'sin partes no se arma nada');
select isnt(completar_archivo('00000000-0000-0000-0000-0000000005b1', 'acta.pdf', 'application/pdf'), null, 'se arma el archivo con sus partes');
select is((select encode(contenido, 'hex') from archivos where nombre = 'acta.pdf'), '010203', 'en el orden correcto');
select throws_ok($$select * from archivos_partes$$, '42501', null, 'las partes no se leen');
select throws_ok($$insert into archivos (nombre, tipo, tamano, contenido) values ('g.pdf', 'application/pdf', 5242881, decode(repeat('00', 5242881), 'hex'))$$,
  '23514', null, 'más de 5 MB no entra');
select throws_ok($$select * from espacio_usado()$$, '42501', null, 'coordinación no ve el espacio usado');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select ok((select base_bytes > 0 and archivos >= 1 from espacio_usado()), 'el superadministrador ve el espacio usado');

select * from finish();
rollback;

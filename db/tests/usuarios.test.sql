-- Gestión de usuarios: solo admin, correo único, auditor con vencimiento, no se toca a sí mismo.
begin;
create extension if not exists pgtap;
select plan(12);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');
insert into sesiones (usuario_id, token, expira_en) values ('00000000-0000-0000-0000-0000000000d1', 'tok-coord', now() + interval '1 day');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select throws_ok($$select * from usuarios_portal()$$, '42501', null, 'coordinación no ve la lista de usuarios');
select throws_ok($$select crear_usuario_portal('x@x.com', 'X', 'admin', 'hash')$$, '42501', null, 'coordinación no crea usuarios');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*) from usuarios_portal() where correo like '%@pgtap.test'), 2::bigint, 'admin ve los usuarios con su correo');
select isnt(crear_usuario_portal('Nueva@Prueba.com ', 'Nueva Persona', 'coordinacion', 'hash-x'), null, 'admin crea un usuario');
select is((select correo from usuarios_portal() where nombre = 'Nueva Persona'), 'nueva@prueba.com', 'el correo se guarda en minúsculas');
select throws_like($$select crear_usuario_portal('nueva@prueba.com', 'Otra', 'coordinacion', 'h')$$, '%Ya existe%', 'no se repite el correo');
select throws_like($$select crear_usuario_portal('aud@x.com', 'Auditor', 'auditor', 'h')$$, '%vencimiento%', 'un auditor necesita fecha de vencimiento');
select throws_like($$update perfiles set rol = 'coordinacion' where id = '00000000-0000-0000-0000-0000000000a1'$$, '%propio rol%', 'el admin no se quita su propio rol');

update perfiles set activo = false where id = '00000000-0000-0000-0000-0000000000d1';
reset role;
select is((select count(*) from sesiones where usuario_id = '00000000-0000-0000-0000-0000000000d1'), 0::bigint, 'al desactivar se cierran sus sesiones');
select is((select usuario from bitacora where tabla = 'perfiles' and despues->>'nombre' = 'Nueva Persona'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'la bitácora registra quién creó el usuario');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$select restablecer_contrasena_portal((select id from perfiles where nombre = 'Nueva Persona'), 'hash-nuevo')$$, 'admin restablece una contraseña');
reset role;
select is((select contrasena from cuentas c join perfiles p on p.id = c.usuario_id where p.nombre = 'Nueva Persona'), 'hash-nuevo', 'la contraseña cambió');

select * from finish();
rollback;

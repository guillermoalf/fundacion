-- Fotos de perfil: cada quien cambia solo la suya; no se borran.
begin;
create extension if not exists pgtap;
select plan(6);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000f1', 'maestra@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'dir@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000f1', 'Maestra', 'personal'),
  ('00000000-0000-0000-0000-0000000000f2', 'Directora', 'admin');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000f1';
select lives_ok($$insert into fotos_perfil (tipo, contenido) values ('image/jpeg', '\xffd8ff'::bytea)$$, 'el personal sube su propia foto');
select is((select count(*) from fotos_perfil), 1::bigint, 'y la ve');
select throws_ok($$insert into fotos_perfil (id, tipo, contenido) values ('00000000-0000-0000-0000-0000000000f2', 'image/jpeg', '\xff'::bytea)$$, '42501', null, 'no sube la foto de otra persona');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000f2';
update fotos_perfil set contenido = null, tipo = null where id = '00000000-0000-0000-0000-0000000000f1';
reset role;
select isnt((select contenido from fotos_perfil where id = '00000000-0000-0000-0000-0000000000f1'), null, 'la dirección no cambia la foto de otra persona');
select throws_like($$delete from fotos_perfil$$, '%No se permite eliminar%', 'no se borran');
select is((select count(*) from bitacora where tabla = 'fotos_perfil' and despues ? 'contenido'), 0::bigint, 'la bitácora no guarda la imagen');

select * from finish();
rollback;

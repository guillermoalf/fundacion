-- Categorías de productos editables por la dirección.
begin;
create extension if not exists pgtap;
select plan(6);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select is((select nombre from categorias_producto where codigo = 'limpieza'), 'Limpieza e higiene', 'Limpieza ahora es «Limpieza e higiene»');
select lives_ok($$insert into categorias_producto (codigo, nombre) values ('pgtap_jardin', 'Jardín pgtap')$$, 'la dirección agrega una categoría');
select throws_ok($$delete from categorias_producto where codigo = 'pgtap_jardin'$$, null, null, 'no se borra: se desactiva');
update categorias_producto set activo = false where codigo = 'pgtap_jardin';
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select throws_ok($$insert into productos (nombre, categoria, unidad) values ('Pala pgtap', 'pgtap_jardin', 'unidad')$$, 'P0001', null, 'una categoría desactivada no se asigna');
select lives_ok($$insert into productos (nombre, categoria, unidad) values ('Martillo pgtap', 'ferreteria', 'unidad')$$, 'las nuevas categorías ya se pueden usar');
update categorias_producto set nombre = 'Otro nombre' where codigo = 'otro';
select is((select nombre from categorias_producto where codigo = 'otro'), 'Otro (artículos de baja cuantía, etc.)', 'coordinación no cambia la lista');

select * from finish();
rollback;

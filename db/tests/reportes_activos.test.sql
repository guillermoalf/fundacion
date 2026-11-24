-- Reportes de activos configurables.
begin;
create extension if not exists pgtap;
select plan(4);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$insert into reportes_activos (id, nombre, config) values ('00000000-0000-0000-0000-00000000bb01', 'PANI activos 2026', '{"fuentes":["PANI"]}')$$, 'la dirección crea un reporte');
select throws_ok($$delete from reportes_activos$$, null, null, 'no se borra: se desactiva');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select is((select count(*)::int from reportes_activos where id = '00000000-0000-0000-0000-00000000bb01'), 1, 'coordinación lo ve y lo puede exportar');
update reportes_activos set nombre = 'Otro' where id = '00000000-0000-0000-0000-00000000bb01';
select is((select nombre from reportes_activos where id = '00000000-0000-0000-0000-00000000bb01'), 'PANI activos 2026', 'pero no lo cambia');

select * from finish();
rollback;

-- Tramos de renta: todos los leen, solo la dirección los carga; rige el juego más reciente.
begin;
create extension if not exists pgtap;
select plan(5);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'conta@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000c1', 'Contabilidad', 'contabilidad');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000c1';
select is((select count(*) from tramos_renta_vigentes('2026-06-30')), 5::bigint, 'en 2026 rigen 5 tramos');
select throws_ok($$insert into tramos_renta (vigente_desde, desde, hasta, tasa, fuente_legal) values ('2099-01-01', 0, null, 0, 'x')$$, '42501', null, 'contabilidad no carga tramos');
select throws_ok($$delete from tramos_renta$$, '42501', null, 'los tramos no se borran');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$insert into tramos_renta (vigente_desde, desde, hasta, tasa, fuente_legal) values ('2099-01-01', 0, 1000000, 0, 'prueba'), ('2099-01-01', 1000000, null, 10, 'prueba')$$, 'la dirección carga un año nuevo');
select is((select count(*) from tramos_renta_vigentes('2099-02-01')), 2::bigint, 'y desde esa fecha rige el nuevo juego');

select * from finish();
rollback;

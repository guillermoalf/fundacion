-- Estudios socioeconómicos de niños PANI.
begin;
create extension if not exists pgtap;
select plan(7);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'maestra@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000e1', 'Maestra', 'personal');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
insert into ninos (id, nombre, apellidos, fuente_id) values ('00000000-0000-0000-0000-00000000aa71', 'Ana', 'PANI pgtap', (select id from fuentes_financiamiento where codigo = 'PANI'));
select is(parametro('estudio_socioeconomico_vigencia_anios'), 5::numeric, 'el estudio vence a los 5 años');
select lives_ok($$insert into estudios_socioeconomicos (nino_id, fecha_elaboracion, fecha_vencimiento, trabajador_social) values ('00000000-0000-0000-0000-00000000aa71', '2022-03-01', '2025-03-01', 'Lic. Prueba')$$, 'la dirección registra el estudio');
select throws_ok($$insert into estudios_socioeconomicos (nino_id, fecha_elaboracion, fecha_vencimiento) values ('00000000-0000-0000-0000-00000000aa71', current_date + 1, current_date + 400)$$, '23514', null, 'no se registra un estudio con fecha futura');
update estudios_socioeconomicos set fecha_elaboracion = '2025-01-01' where nino_id = '00000000-0000-0000-0000-00000000aa71';
select is((select fecha_elaboracion from estudios_socioeconomicos where nino_id = '00000000-0000-0000-0000-00000000aa71'), '2022-03-01'::date, 'un estudio registrado no se cambia (se registra el nuevo)');
select throws_ok($$delete from estudios_socioeconomicos$$, null, null, 'ni se borra');
select throws_ok($$insert into estudios_socioeconomicos (nino_id, fecha_elaboracion, fecha_vencimiento) values ('00000000-0000-0000-0000-00000000aa71', '2024-01-01', '2023-01-01')$$, '23514', null, 'el vencimiento debe ser después de la elaboración');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from estudios_socioeconomicos), 0, 'el personal no ve los estudios');

select * from finish();
rollback;

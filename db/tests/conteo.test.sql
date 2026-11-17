-- Conteo físico: se marca mientras está abierto; cerrado, solo se adjunta el acta.
begin;
create extension if not exists pgtap;
select plan(5);

insert into usuarios (id, correo, nombre) values ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test', 'c');
insert into perfiles (id, nombre, rol) values ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso)
  values ('00000000-0000-0000-0000-00000000e001', '7-7777-7777', 'Maestra', 'Docente', '2024-01-08');
insert into activos (id, placa, tipo_bien, ubicacion_id, fuente_id) values ('00000000-0000-0000-0000-00000000ac01', 'C-1', 'Silla', 1, 1);
insert into conteos_fisicos (id, ubicacion_id, responsable_id) values ('00000000-0000-0000-0000-00000000c001', 1, '00000000-0000-0000-0000-00000000e001');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select lives_ok($$insert into conteo_detalle (conteo_id, activo_id, encontrado) values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000ac01', true)$$, 'se marca un activo con el conteo abierto');
select lives_ok($$update conteos_fisicos set cerrado = true where id = '00000000-0000-0000-0000-00000000c001'$$, 'se cierra el conteo');
select throws_like($$update conteo_detalle set encontrado = false$$, '%ya está cerrado%', 'cerrado, no se cambia lo encontrado');
select lives_ok($$update conteos_fisicos set acta_firmada_url = '/portal/archivos/x' where id = '00000000-0000-0000-0000-00000000c001'$$, 'se adjunta el acta firmada');
select throws_like($$update conteos_fisicos set acta_firmada_url = '/portal/archivos/y' where id = '00000000-0000-0000-0000-00000000c001'$$, '%ya está cerrado%', 'el acta no se reemplaza');

select * from finish();
rollback;

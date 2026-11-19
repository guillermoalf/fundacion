-- Ajustes 18/11: espacio solo superadmin, umbral de baja cuantía, activo sin ubicación, archivos de compra.
begin;
create extension if not exists pgtap;
select plan(8);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'super@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'Super', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select throws_ok($$select * from espacio_usado()$$, '42501', null, 'la dirección ya no ve el espacio usado');
select is(umbral_activo('2026-11-18'), 115550.00::numeric, 'en 2026 es activo lo que cuesta más de ₡115 550 por unidad');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000b1';
select ok((select base_bytes > 0 from espacio_usado()), 'el superadministrador ve el espacio usado');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';
select lives_ok($$insert into activos (id, tipo_bien, fuente_id) values ('00000000-0000-0000-0000-00000000ac01', 'Televisor', 1)$$, 'un activo se registra sin ubicación');
select ok(exists(select 1 from v_activos_alertas where activo_id = '00000000-0000-0000-0000-00000000ac01' and alerta = 'Sin ubicación'), 'y aparece como pendiente «Sin ubicación»');
select ok(exists(select 1 from activos_al_corte(current_date) where activo_id = '00000000-0000-0000-0000-00000000ac01'), 'y sale en el reporte del PANI');
insert into proveedores (id, nombre) values (9001, 'Proveedor pgtap');
insert into compras (id, proveedor_id, fuente_id, numero_factura, fecha, total) values ('00000000-0000-0000-0000-0000000000c9', 9001, 1, 'X-1', '2026-11-18', 1);
insert into archivos (id, nombre, tipo, tamano, contenido) values ('00000000-0000-0000-0000-00000000f001', 'factura.xml', 'application/xml', 3, '\x3c613e');
select lives_ok($$insert into compra_archivos (compra_id, archivo_id) values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-00000000f001')$$, 'una compra guarda el XML de la factura');
select throws_ok($$delete from compra_archivos$$, '42501', null, 'los archivos de una compra no se borran');

select * from finish();
rollback;

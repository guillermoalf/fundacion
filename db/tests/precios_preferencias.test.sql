-- Precios con IVA por línea, historial de precios y preferencias de listas por usuario.
begin;
create extension if not exists pgtap;
select plan(7);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a1', 'Valeria', 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', 'Noemy', 'admin');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
insert into proveedores (id, nombre) values (9101, 'Proveedor A pgtap'), (9102, 'Proveedor B pgtap');
insert into productos (id, nombre, categoria, unidad) values (9101, 'Leche pgtap', 'lacteos', 'litro');
insert into compras (id, proveedor_id, fuente_id, numero_factura, fecha, subtotal, iva, total) values
  ('00000000-0000-0000-0000-00000000c101', 9101, 1, 'P-1', '2026-11-01', 1000, 10, 1010),
  ('00000000-0000-0000-0000-00000000c102', 9102, 1, 'P-2', '2026-11-10', 1100, 11, 1111);
insert into compra_lineas (compra_id, tipo, descripcion, producto_id, cantidad, precio_unitario, iva_linea) values
  ('00000000-0000-0000-0000-00000000c101', 'consumible', 'Leche', 9101, 10, 100, 10),
  ('00000000-0000-0000-0000-00000000c102', 'consumible', 'Leche', 9101, 10, 110, 11);
select is((select count(*)::int from v_precios_producto where producto_id = 9101), 2, 'el historial tiene una fila por compra');
select is((select precio_con_iva from v_precios_producto where producto_id = 9101 and proveedor_id = 9102), 111.10::numeric, 'el precio por unidad incluye el IVA de la línea');
select is((select iva_unitario from v_precios_producto where producto_id = 9101 and proveedor_id = 9101), 1.00::numeric, 'y se ve el IVA por unidad');
select ok(exists(select 1 from categorias_producto where codigo = 'lacteos' and reporte = 'alimentos' and activo), 'Lácteos existe y sale en el reporte de alimentos');

select lives_ok($$insert into preferencias_tabla (tabla, config) values ('/portal/inventario', '{"columnas":["producto","precio"]}')$$, 'cada usuario guarda sus columnas');
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a2';
select is((select count(*)::int from preferencias_tabla), 0, 'otra persona no ve las preferencias de la primera');
select throws_ok($$insert into preferencias_tabla (usuario_id, tabla, config) values ('00000000-0000-0000-0000-0000000000a1', '/x', '{}')$$, '42501', null, 'ni las puede cambiar');

select * from finish();
rollback;

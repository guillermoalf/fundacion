-- Revertir bajas (solo superadmin) y color de ubicaciones.
begin;
create extension if not exists pgtap;
select plan(6);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000b1', 'super@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'dir@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000b1', 'Super', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000b2', 'Directora', 'admin');
insert into activos (id, tipo_bien, placa, estado, fecha_baja, motivo_baja, fuente_id)
  select '00000000-0000-0000-0000-00000000ac01', 'Laptop', 'T-099', 'dado_de_baja', '2026-11-20', 'Prueba', id from fuentes_financiamiento where codigo = 'PANI';

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000b2';
select throws_ok($$select revertir_baja('00000000-0000-0000-0000-00000000ac01', 'era prueba')$$, '42501', null, 'Dirección no revierte una baja');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000b1';
select throws_like($$select revertir_baja('00000000-0000-0000-0000-00000000ac01', ' ')$$, '%motivo%', 'pide el motivo');
select lives_ok($$select revertir_baja('00000000-0000-0000-0000-00000000ac01', 'era prueba')$$, 'el superadmin revierte la baja');
select is((select estado::text from activos where id = '00000000-0000-0000-0000-00000000ac01'), 'en_uso', 'el activo vuelve a estar en uso');
reset role;
select is((select motivo from bitacora where tabla = 'activos' and registro_id = '00000000-0000-0000-0000-00000000ac01' order by id desc limit 1), 'era prueba', 'la bitácora guarda el motivo');
select throws_ok($$update ubicaciones set color = 'rojo'$$, '23514', null, 'el color debe ser un código válido');

select * from finish();
rollback;

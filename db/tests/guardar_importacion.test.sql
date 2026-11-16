-- guardar_importacion_activos: todo o nada, sin duplicar archivos, con RLS y bitácora.
-- Corre con: npm run db:test
begin;
create extension if not exists pgtap;
select plan(12);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion'),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor');

create function pg_temp.activo(placa text, ubicacion text, categoria text default 'Cocinas', costo numeric default 1000)
returns jsonb language sql as $$
  select jsonb_build_object('placa', placa, 'tipo_bien', 'Bien ' || placa, 'ubicacion', ubicacion,
    'categoria_id', (select id from categorias_activo where nombre = categoria), 'costo', costo,
    'fecha_adquisicion', '2024-01-15', 'fila_origen', 'prueba.xlsx · fila ' || placa)
$$;

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000d1';

-- Una fila inválida (costo negativo) hace fallar todo: no queda ni la ubicación nueva ni los otros activos
select throws_ok(
  $$select guardar_importacion_activos('PANI', 'prueba.xlsx',
      '[{"nombre":"Aula Pgtap","tipo":"aula"}]',
      jsonb_build_array(pg_temp.activo('P01', 'Aula Pgtap'), pg_temp.activo('P02', 'Aula Pgtap', 'Cocinas', -5)))$$,
  '23514', null, 'una fila inválida rechaza toda la importación');
select is((select count(*) from activos where fila_origen like 'prueba.xlsx%'), 0::bigint, 'no quedó ningún activo a medias');
select is((select count(*) from ubicaciones where nombre = 'Aula Pgtap'), 0::bigint, 'tampoco quedó la ubicación nueva');

-- Importación correcta
select is(
  guardar_importacion_activos('PANI', 'prueba.xlsx', '[{"nombre":"Aula Pgtap","tipo":"aula"}]',
    jsonb_build_array(pg_temp.activo('P01', 'Aula Pgtap'), pg_temp.activo('P02', 'Cocina'))),
  '{"activos": 2, "ubicacionesCreadas": ["Aula Pgtap"]}'::jsonb,
  'guarda los activos y crea la ubicación');
select is((select count(*) from activos where fila_origen like 'prueba.xlsx%' and origen = 'importacion'), 2::bigint, 'dos activos con origen importación');
select is(
  (select count(*) from activo_movimientos m join activos a on a.id = m.activo_id
   where a.fila_origen like 'prueba.xlsx%' and m.tipo = 'alta'),
  2::bigint, 'cada activo tiene su movimiento de alta');
select is(
  (select fuente_id from activos where placa = 'P01'),
  (select id from fuentes_financiamiento where codigo = 'PANI'), 'queda con la fuente elegida');

-- El mismo archivo no se importa dos veces, salvo que se confirme
select throws_ok(
  $$select guardar_importacion_activos('PANI', 'prueba.xlsx', '[]', jsonb_build_array(pg_temp.activo('P03', 'Cocina')))$$,
  'CF001', null, 'el mismo archivo no se importa dos veces');
select lives_ok(
  $$select guardar_importacion_activos('PANI', 'prueba.xlsx', '[]', jsonb_build_array(pg_temp.activo('P03', 'Cocina')), true)$$,
  'con p_forzar sí se puede reimportar');

-- Ubicación inexistente o fila retirada: se rechaza
select throws_like(
  $$select guardar_importacion_activos('PANI', 'otro.xlsx', '[]', jsonb_build_array(pg_temp.activo('P04', 'No Existe')))$$,
  '%"No Existe" no existe%', 'una ubicación que no existe se rechaza');

-- Un auditor no puede importar (RLS)
set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select throws_ok(
  $$select guardar_importacion_activos('PANI', 'auditor.xlsx', '[]', jsonb_build_array(pg_temp.activo('P05', 'Cocina')))$$,
  '42501', null, 'un auditor no puede importar');

-- La bitácora registra a la coordinadora como autora (se revisa sin rol: coordinación no lee la bitácora)
reset role;
select is(
  (select distinct usuario from bitacora where tabla = 'activos' and despues->>'fila_origen' like 'prueba.xlsx%'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, 'la bitácora registra quién importó');

select * from finish();
rollback;

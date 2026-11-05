-- Permisos del portal: lo que cada rol puede leer y escribir lo decide el RLS de la base.
-- Corre con: npx supabase test db   (todo ocurre dentro de una transacción que se revierte)
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Usuarios de prueba, uno por rol, más un auditor con el acceso vencido y un perfil inactivo
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'conta@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'coord@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'auditor@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'vencido@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000f1', 'inactivo@pgtap.test');
insert into perfiles (id, nombre, rol, acceso_hasta, activo) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin', null, true),
  ('00000000-0000-0000-0000-0000000000c1', 'Contabilidad', 'contabilidad', null, true),
  ('00000000-0000-0000-0000-0000000000d1', 'Coordinación', 'coordinacion', null, true),
  ('00000000-0000-0000-0000-0000000000e1', 'Auditor', 'auditor', current_date + 7, true),
  ('00000000-0000-0000-0000-0000000000e2', 'Auditor vencido', 'auditor', current_date - 1, true),
  ('00000000-0000-0000-0000-0000000000f1', 'Inactivo', 'coordinacion', null, false);
insert into activos (placa, tipo_bien, ubicacion_id, fuente_id) values ('T-001', 'Activo de prueba', 1, 1);

create function pg_temp.como(usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', usuario, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.anonimo() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Sin sesión (anon key pública): no ve nada, tampoco por las vistas
select pg_temp.anonimo();
select is((select count(*) from activos), 0::bigint, 'anon no ve activos');
select is((select count(*) from v_activos_alertas), 0::bigint, 'anon no ve v_activos_alertas');
select is((select count(*) from v_saldo_inventario), 0::bigint, 'anon no ve v_saldo_inventario');
select is((select count(*) from activos_al_corte(current_date)), 0::bigint, 'anon no ve activos_al_corte');
select throws_ok($$insert into activos (tipo_bien, ubicacion_id, fuente_id) values ('x', 1, 1)$$, '42501', null, 'anon no inserta activos');

-- Auditor vigente: lee todo, no escribe
select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
select ok(exists(select 1 from activos where placa = 'T-001'), 'auditor lee activos');
select isnt_empty($$select * from v_activos_alertas$$, 'auditor lee pendientes');
select isnt_empty($$select * from bitacora$$, 'auditor lee la bitácora');
select throws_ok($$insert into activos (tipo_bien, ubicacion_id, fuente_id) values ('x', 1, 1)$$, '42501', null, 'auditor no inserta activos');
select is_empty($$update activos set notas = 'x' returning id$$, 'auditor no actualiza activos');

-- Auditor vencido e inactivo: no ven nada
select pg_temp.como('00000000-0000-0000-0000-0000000000e2');
select is((select count(*) from activos), 0::bigint, 'auditor con acceso vencido no ve activos');
select is((select count(*) from perfiles), 0::bigint, 'auditor vencido no lee ni su perfil');
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select is((select count(*) from activos), 0::bigint, 'perfil inactivo no ve activos');

-- Coordinación: registra activos, no gestiona usuarios ni la tabla de depreciación ni ve la bitácora
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$insert into activos (placa, tipo_bien, ubicacion_id, fuente_id) values ('T-002', 'Silla', 1, 1)$$, 'coordinación inserta activos');
select throws_ok($$insert into perfiles (id, nombre, rol) values ('00000000-0000-0000-0000-0000000000f1', 'x', 'admin')$$, '42501', null, 'coordinación no crea perfiles');
select is_empty($$update perfiles set rol = 'admin' where id = '00000000-0000-0000-0000-0000000000d1' returning id$$, 'coordinación no se sube el rol');
select throws_ok($$insert into categorias_activo (nombre, tasa_anual, anios_vida) values ('X', 10, 10)$$, '42501', null, 'coordinación no agrega filas de depreciación');
select is((select count(*) from bitacora), 0::bigint, 'coordinación no lee la bitácora');

-- Contabilidad: escribe, pero no crea perfiles
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$insert into perfiles (id, nombre, rol) values ('00000000-0000-0000-0000-0000000000f1', 'x', 'admin')$$, '42501', null, 'contabilidad no crea perfiles');

-- Admin: gestiona perfiles y la tabla de depreciación
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select isnt_empty($$update perfiles set acceso_hasta = current_date + 14 where id = '00000000-0000-0000-0000-0000000000e1' returning id$$, 'admin extiende el acceso de un auditor');
select lives_ok($$insert into categorias_activo (nombre, tasa_anual, anios_vida) values ('Fila de prueba', 10, 10)$$, 'admin agrega filas de depreciación');

-- Nada se borra, ni siquiera el admin (RLS sin política de DELETE: no afecta filas)
select is_empty($$delete from activos returning id$$, 'admin no borra activos');
reset role;
select throws_ok($$delete from activos where placa = 'T-001'$$, 'P0001', null, 'el trigger bloquea el DELETE aun sin RLS');
-- (se revisa sin rol: coordinación, a propósito, no puede leer la bitácora)
select is(
  (select usuario from bitacora where tabla = 'activos' and despues->>'placa' = 'T-002'),
  '00000000-0000-0000-0000-0000000000d1'::uuid,
  'la bitácora registra a coordinación como autora');

select * from finish();
rollback;

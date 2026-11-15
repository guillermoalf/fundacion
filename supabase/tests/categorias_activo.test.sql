-- Reglas de la tabla de depreciación (migración 20261104000002). Corre con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test');
insert into perfiles (id, nombre, rol) values ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin');
insert into activos (placa, tipo_bien, ubicacion_id, fuente_id, categoria_id)
  values ('T-1', 'Lavadora de prueba', 1, 1, (select id from categorias_activo where nombre = 'Equipo de lavandería'));

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_like(
  $$update categorias_activo set tasa_anual = 20 where nombre = 'Equipo de lavandería'$$,
  '%ya la usan activos%', 'no se cambia la tasa de una fila en uso');
select throws_like(
  $$update categorias_activo set anios_vida = 5 where nombre = 'Equipo de lavandería'$$,
  '%ya la usan activos%', 'no se cambian los años de una fila en uso');
select isnt_empty(
  $$update categorias_activo set tasa_anual = 12 where nombre = 'Cocinas' returning id$$,
  'sí se cambia la tasa de una fila sin activos');
select isnt_empty(
  $$update categorias_activo set palabras_clave = palabras_clave || 'secadora'::text where nombre = 'Equipo de lavandería' returning id$$,
  'en una fila en uso se pueden editar las palabras clave');
select isnt_empty(
  $$update categorias_activo set activa = false where nombre = 'Equipo de lavandería' returning id$$,
  'una fila en uso se puede retirar');
select lives_ok(
  $$update activos set notas = 'revisado' where placa = 'T-1'$$,
  'el activo conserva su fila retirada');
select throws_like(
  $$insert into activos (tipo_bien, ubicacion_id, fuente_id, categoria_id)
    values ('Otra lavadora', 1, 1, (select id from categorias_activo where nombre = 'Equipo de lavandería'))$$,
  '%retirada%', 'no se asigna una fila retirada a un activo nuevo');

select * from finish();
rollback;

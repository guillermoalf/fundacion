-- Superadministrador: corrige lo cerrado con motivo, el motivo queda en la bitácora, nadie borra,
-- y la dirección no puede darse ese rol ni tocar al superadministrador.
begin;
create extension if not exists pgtap;
select plan(12);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000b1', 'super@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000b1', 'Super', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin');
insert into empleados (id, cedula, nombre, puesto, fecha_ingreso) values ('00000000-0000-0000-0000-00000000e001', '5-5555-5555', 'Prueba', 'Docente', '2024-01-08');
insert into planillas (id, periodo_inicio, periodo_fin, estado) values ('00000000-0000-0000-0000-0000000000f1', '2032-01-01', '2032-01-31', 'borrador');
insert into planilla_lineas (planilla_id, empleado_id, salario_base, dias_laborados, salario_bruto, ccss_obrero, salario_neto, cargas_patronales, provision_aguinaldo, provision_vacaciones)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 100, 30, 100, 1, 99, 1, 1, 1);
update planillas set estado = 'aprobada' where id = '00000000-0000-0000-0000-0000000000f1';
update planillas set estado = 'pagada' where id = '00000000-0000-0000-0000-0000000000f1';
insert into marcas (id, empleado_id, tipo, origen, motivo_manual) values ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000e001', 'entrada', 'manual', 'x');

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select throws_like($$update planilla_lineas set salario_neto = 98 where planilla_id = '00000000-0000-0000-0000-0000000000f1'$$, '%ya no está en borrador%', 'la dirección no cambia una planilla pagada');
select is_empty($$update marcas set tipo = 'salida' where id = '00000000-0000-0000-0000-0000000000a9' returning id$$, 'la dirección no edita marcas');
select throws_like($$update perfiles set rol = 'superadmin' where id = '00000000-0000-0000-0000-0000000000a1'$$, '%propio rol%', 'la dirección no se sube a superadministrador');
select throws_like($$update perfiles set activo = false where id = '00000000-0000-0000-0000-0000000000b1'$$, '%Solo el superadministrador%', 'la dirección no desactiva al superadministrador');
select is((select count(*) from tablas_corregibles()), 0::bigint, 'la dirección no ve el editor de correcciones');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000b1';
select throws_like($$update planilla_lineas set salario_neto = 98 where planilla_id = '00000000-0000-0000-0000-0000000000f1'$$, '%escribir el motivo%', 'sin motivo, ni el superadministrador');
set local app.motivo = 'Error de digitación en el neto';
select lives_ok($$update planilla_lineas set salario_neto = 98 where planilla_id = '00000000-0000-0000-0000-0000000000f1'$$, 'con motivo, corrige una planilla pagada');
select isnt_empty($$update marcas set tipo = 'salida' where id = '00000000-0000-0000-0000-0000000000a9' returning id$$, 'corrige una marca');
select lives_ok($$update perfiles set rol = 'coordinacion' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'cambia el rol de la dirección');
select throws_ok($$delete from marcas$$, '42501', null, 'ni el superadministrador borra');
select ok((select count(*) from tablas_corregibles() where tabla = 'planilla_lineas' and llave = array['planilla_id', 'empleado_id']) = 1, 've las tablas corregibles con su llave');
reset role;
select is((select motivo from bitacora where tabla = 'planilla_lineas' and accion = 'UPDATE' order by id desc limit 1), 'Error de digitación en el neto', 'el motivo queda en la bitácora');

select * from finish();
rollback;

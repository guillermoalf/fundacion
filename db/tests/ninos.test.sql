-- Niños: quién ve qué, pasar lista y reglas de retiro.
begin;
create extension if not exists pgtap;
select plan(14);

insert into usuarios (id, correo, nombre) select id::uuid, correo, correo from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'personal@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'conta@pgtap.test'),
  ('00000000-0000-0000-0000-0000000000f1', 'auditor@pgtap.test')) v(id, correo);
insert into perfiles (id, nombre, rol, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin', null),
  ('00000000-0000-0000-0000-0000000000e1', 'Maestra', 'personal', null),
  ('00000000-0000-0000-0000-0000000000c1', 'Conta', 'contabilidad', null),
  ('00000000-0000-0000-0000-0000000000f1', 'Auditor', 'auditor', current_date + 30);

set local role app_portal;
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select lives_ok($$insert into ninos (id, nombre, apellidos, fecha_ingreso) values ('00000000-0000-0000-0000-00000000aa01', 'Ana', 'Mora', current_date - 30)$$, 'la dirección registra un niño');
insert into responsables_nino (nino_id, nombre, parentesco, telefono, es_legal) values ('00000000-0000-0000-0000-00000000aa01', 'Madre', 'Madre', '8888-8888', true);
insert into notas_nino (nino_id, texto) values ('00000000-0000-0000-0000-00000000aa01', 'Nota delicada');
select lives_ok($$insert into asistencia_ninos (nino_id, fecha, estado) values ('00000000-0000-0000-0000-00000000aa01', current_date - 2, 'ausente')$$, 'la dirección registra un día anterior');
select throws_ok($$delete from ninos$$, null, null, 'los niños no se borran');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from ninos where id = '00000000-0000-0000-0000-00000000aa01'), 1, 'el personal ve a los niños');
select is((select count(*)::int from responsables_nino where nino_id = '00000000-0000-0000-0000-00000000aa01'), 1, 'y los contactos de sus responsables');
select is((select count(*)::int from notas_nino where nino_id = '00000000-0000-0000-0000-00000000aa01'), 0, 'pero no las notas');
select is((select count(*)::int from proveedores), 0, 'ni nada administrativo');
select is((select count(*)::int from perfiles), 1, 've solo su propio perfil');
select lives_ok($$insert into asistencia_ninos (nino_id, fecha, estado, hora_llegada) values ('00000000-0000-0000-0000-00000000aa01', current_date, 'presente', '07:10')$$, 'el personal pasa lista de hoy');
select throws_ok($$insert into asistencia_ninos (nino_id, fecha, estado) values ('00000000-0000-0000-0000-00000000aa01', current_date - 1, 'presente')$$, '42501', null, 'pero no de días anteriores');
update ninos set nombre = 'Otro' where id = '00000000-0000-0000-0000-00000000aa01';
select is((select nombre from ninos where id = '00000000-0000-0000-0000-00000000aa01'), 'Ana', 'ni edita los datos del niño');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000c1';
select is((select count(*)::int from ninos where id = '00000000-0000-0000-0000-00000000aa01'), 0, 'contabilidad no ve a los niños');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000f1';
select is((select count(*)::int from notas_nino where nino_id = '00000000-0000-0000-0000-00000000aa01'), 1, 'auditoría ve las notas (solo lectura)');

set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
update ninos set estado = 'retirado', fecha_retiro = current_date - 1, motivo_retiro = 'Se mudó' where id = '00000000-0000-0000-0000-00000000aa01';
select throws_ok($$insert into asistencia_ninos (nino_id, fecha, estado) values ('00000000-0000-0000-0000-00000000aa01', current_date + 1, 'presente')$$, 'P0001', null, 'a un niño retirado no se le pasa lista');

select * from finish();
rollback;

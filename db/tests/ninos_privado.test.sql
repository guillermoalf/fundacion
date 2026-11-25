-- Un niño privado no puede tener subsidio a la vez.
begin;
create extension if not exists pgtap;
select plan(2);
select lives_ok($$insert into ninos (nombre, apellidos, privado) values ('Privado', 'Prueba', true)$$, 'se registra un niño privado');
select throws_ok($$insert into ninos (nombre, apellidos, privado, fuente_id) values ('Doble', 'Prueba', true, (select id from fuentes_financiamiento where codigo = 'PANI'))$$, '23514', null, 'no puede ser privado y tener subsidio');
select * from finish();
rollback;

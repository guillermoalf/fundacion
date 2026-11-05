-- Las fechas por defecto (current_date) deben ser las de Costa Rica, no las de UTC.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
select is(current_setting('timezone'), 'America/Costa_Rica', 'la base usa la hora de Costa Rica');
select is(current_date, (now() at time zone 'America/Costa_Rica')::date, 'current_date es la fecha de Costa Rica');
select * from finish();
rollback;

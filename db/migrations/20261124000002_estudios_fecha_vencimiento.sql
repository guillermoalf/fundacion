-- migrate:up
-- No todos los estudios duran lo mismo: se anota la fecha de vencimiento que trae cada uno.
-- Los ya registrados quedan con la vigencia del parámetro (5 años desde que se elaboraron).
alter table estudios_socioeconomicos add column fecha_vencimiento date;
update estudios_socioeconomicos
set fecha_vencimiento = (fecha_elaboracion + make_interval(years => coalesce(parametro('estudio_socioeconomico_vigencia_anios', fecha_elaboracion), 5)::int))::date
where fecha_vencimiento is null;
alter table estudios_socioeconomicos alter column fecha_vencimiento set not null,
  add constraint estudios_vence_despues check (fecha_vencimiento > fecha_elaboracion);

-- migrate:down

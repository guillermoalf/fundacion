-- migrate:up
-- La base corría en UTC: desde las 6 p. m. de Costa Rica current_date ya era el día siguiente.
-- Eso fechaba con "mañana" los movimientos registrados en la tarde (columnas default current_date),
-- cortaba el acceso de un auditor a las 6 p. m. de su último día y movía la vigencia de parámetros.
-- Costa Rica no tiene horario de verano: siempre UTC-6. Los timestamptz no cambian (son instantes);
-- solo cambia cómo se interpretan current_date y las conversiones a fecha.
do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'America/Costa_Rica');
end $$;

-- migrate:down

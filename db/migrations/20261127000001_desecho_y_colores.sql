-- migrate:up
-- Color de cada ubicación (lo escoge Dirección en Activos → Ubicaciones). Null = color automático.
alter table ubicaciones add column color text check (color ~ '^#[0-9a-f]{6}$');

-- Revertir la baja de un activo (vuelve a la lista de Activos). Solo el superadministrador y con motivo,
-- que queda en la bitácora y en el historial del activo.
create or replace function revertir_baja(p_activo uuid, p_motivo text) returns void
language plpgsql as $$
declare v_ubicacion smallint;
begin
  if not es_superadmin() then
    raise exception 'Solo el superadministrador puede revertir una baja.' using errcode = '42501';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Escriba el motivo para revertir la baja.';
  end if;
  perform set_config('app.motivo', p_motivo, true);
  update activos set estado = 'en_uso', fecha_baja = null, motivo_baja = null
    where id = p_activo and estado = 'dado_de_baja' returning ubicacion_id into v_ubicacion;
  if not found then
    raise exception 'Ese activo no está dado de baja.';
  end if;
  insert into activo_movimientos (activo_id, tipo, fecha, ubicacion_destino_id, motivo)
  values (p_activo, 'ajuste', (now() at time zone 'America/Costa_Rica')::date, v_ubicacion, 'Baja revertida: ' || p_motivo);
end $$;

-- migrate:down

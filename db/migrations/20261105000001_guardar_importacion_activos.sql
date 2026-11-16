-- migrate:up
-- Guardado de una importación de Excel en una sola transacción.
-- Antes guardar.ts hacía varios inserts sueltos (ubicaciones, activos, movimientos): si uno fallaba
-- a la mitad quedaban activos sin su movimiento de alta, y como nada se borra no había cómo deshacerlo.
-- Una función de Postgres es atómica: o se guarda todo o no se guarda nada.
--
-- security invoker (por defecto): corre con los permisos de quien llama, así que aplica el RLS
-- (puede_escribir) y la bitácora registra usuario_actual() como autor de cada fila.
--
-- p_ubicaciones_nuevas: [{ "nombre": "Aula 3", "tipo": "aula" }, ...]
-- p_activos: [{ placa, tipo_bien, marca, modelo, serie, categoria_id, ubicacion, fecha_adquisicion,
--               costo, unidades_compra, fila_origen, notas }, ...]  (ubicacion = nombre exacto)
create or replace function guardar_importacion_activos(
  p_fuente text,
  p_archivo text,
  p_ubicaciones_nuevas jsonb,
  p_activos jsonb,
  p_forzar boolean default false
) returns jsonb
language plpgsql as $$
declare
  v_fuente smallint;
  v_creadas text[];
  v_sin_ubicacion text;
  v_activos int;
begin
  select id into v_fuente from fuentes_financiamiento where codigo = p_fuente and activo;
  if v_fuente is null then
    raise exception 'La fuente de financiamiento "%" no existe o está inactiva.', p_fuente;
  end if;

  -- Importar dos veces el mismo archivo duplicaría los activos, y no se pueden borrar.
  if not p_forzar and exists (select 1 from activos where starts_with(fila_origen, p_archivo || ' · fila ')) then
    raise exception 'El archivo "%" ya se importó. Si de verdad quiere importarlo otra vez, confírmelo.', p_archivo
      using errcode = 'CF001';
  end if;

  insert into ubicaciones (nombre, tipo)
  select x->>'nombre', coalesce(x->>'tipo', 'area_comun')
  from jsonb_array_elements(coalesce(p_ubicaciones_nuevas, '[]')) x;
  select coalesce(array_agg(x->>'nombre'), '{}') into v_creadas
  from jsonb_array_elements(coalesce(p_ubicaciones_nuevas, '[]')) x;

  select a.ubicacion into v_sin_ubicacion
  from jsonb_to_recordset(p_activos) as a(ubicacion text)
  where not exists (select 1 from ubicaciones u where u.nombre = a.ubicacion)
  limit 1;
  if found then
    raise exception 'La ubicación "%" no existe.', coalesce(v_sin_ubicacion, '(vacía)');
  end if;

  with nuevos as (
    insert into activos (
      placa, tipo_bien, marca, modelo, serie, categoria_id, ubicacion_id, fuente_id,
      fecha_adquisicion, costo, unidades_compra, origen, fila_origen, notas)
    select a.placa, a.tipo_bien, a.marca, a.modelo, a.serie, a.categoria_id, u.id, v_fuente,
           a.fecha_adquisicion, a.costo, a.unidades_compra, 'importacion', a.fila_origen, a.notas
    from jsonb_to_recordset(p_activos) as a(
      placa text, tipo_bien text, marca text, modelo text, serie text, categoria_id smallint,
      ubicacion text, fecha_adquisicion date, costo numeric, unidades_compra int,
      fila_origen text, notas text)
    join ubicaciones u on u.nombre = a.ubicacion
    returning id, ubicacion_id
  )
  insert into activo_movimientos (activo_id, tipo, ubicacion_destino_id, motivo)
  select id, 'alta', ubicacion_id, 'Migración desde Excel: ' || p_archivo from nuevos;
  get diagnostics v_activos = row_count;

  return jsonb_build_object('activos', v_activos, 'ubicacionesCreadas', to_jsonb(v_creadas));
end $$;

-- migrate:down

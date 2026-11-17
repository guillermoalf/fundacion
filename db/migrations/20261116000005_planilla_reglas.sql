-- migrate:up
-- Planilla: una vez aprobada no se toca. Las líneas solo se crean o editan en borrador;
-- los estados avanzan borrador → aprobada → pagada, y se puede anular (queda registrada, no se borra).

create or replace function proteger_planilla() returns trigger language plpgsql as $$
begin
  if old.estado in ('pagada', 'anulada') then
    raise exception 'Esta planilla ya está %: no se puede cambiar.', old.estado;
  end if;
  if old.estado = 'aprobada' and not (new.estado in ('pagada', 'anulada') and
      (new.periodo_inicio, new.periodo_fin, new.tipo) = (old.periodo_inicio, old.periodo_fin, old.tipo)) then
    raise exception 'La planilla ya está aprobada: solo se puede marcar como pagada o anular.';
  end if;
  if old.estado = 'borrador' and new.estado = 'pagada' then
    raise exception 'Primero hay que aprobar la planilla.';
  end if;
  if new.estado = 'aprobada' and old.estado = 'borrador' then
    new.aprobada_por := usuario_actual();
    new.aprobada_en := now();
  end if;
  return new;
end $$;
create trigger planillas_proteger before update on planillas for each row execute function proteger_planilla();

create or replace function lineas_solo_en_borrador() returns trigger language plpgsql as $$
begin
  if (select estado from planillas where id = new.planilla_id) <> 'borrador' then
    raise exception 'La planilla ya no está en borrador: sus montos no se pueden cambiar.';
  end if;
  return new;
end $$;
create trigger planilla_lineas_solo_borrador before insert or update on planilla_lineas
  for each row execute function lineas_solo_en_borrador();

-- Licencia de maternidad: el patrono paga el 50 % del salario y la CCSS el otro 50 % (Código de Trabajo, art. 95).
insert into parametros (clave, valor, vigente_desde, fuente_legal)
select 'licencia_maternidad_patrono_pct', 50, '1990-01-01', 'Código de Trabajo art. 95: el patrono paga el 50 % del salario durante la licencia'
where not exists (select 1 from parametros where clave = 'licencia_maternidad_patrono_pct');

-- migrate:down

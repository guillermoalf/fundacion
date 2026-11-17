-- migrate:up
-- Conteo físico: mientras está abierto se marcan los activos; al cerrarlo queda fijo.
-- Después de cerrado solo se puede adjuntar el acta firmada (una vez).

create or replace function proteger_conteo() returns trigger language plpgsql as $$
begin
  if old.cerrado then
    if not new.cerrado
       or (new.ubicacion_id, new.fecha, new.responsable_id, new.observaciones) is distinct from (old.ubicacion_id, old.fecha, old.responsable_id, old.observaciones)
       or (old.acta_firmada_url is not null and new.acta_firmada_url is distinct from old.acta_firmada_url) then
      raise exception 'El conteo ya está cerrado: solo se puede adjuntar el acta firmada.';
    end if;
  end if;
  return new;
end $$;
create trigger conteos_fisicos_proteger before update on conteos_fisicos for each row execute function proteger_conteo();

create or replace function detalle_solo_abierto() returns trigger language plpgsql as $$
begin
  if (select cerrado from conteos_fisicos where id = new.conteo_id) then
    raise exception 'El conteo ya está cerrado: no se puede cambiar lo que se encontró.';
  end if;
  return new;
end $$;
create trigger conteo_detalle_solo_abierto before insert or update on conteo_detalle
  for each row execute function detalle_solo_abierto();

-- migrate:down

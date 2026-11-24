-- migrate:up
-- Estudios socioeconómicos de los niños y niñas PANI: vencen 5 años después de que el trabajador social
-- los elabora. Si vence y el PANI sigue pagando, después le cobra a la fundación todo ese tiempo.
insert into parametros (clave, valor, vigente_desde, fuente_legal)
select v.clave, v.valor, '2000-01-01', v.fuente from (values
  ('estudio_socioeconomico_vigencia_anios', 5, 'PANI: el estudio socioeconómico vence a los 5 años de elaborado'),
  ('estudio_socioeconomico_aviso_dias', 180, 'Aviso permanente cuando faltan 6 meses (decisión de la fundación)'),
  ('estudio_socioeconomico_urgente_dias', 90, 'Aviso urgente cuando faltan 3 meses (decisión de la fundación)')
) as v(clave, valor, fuente)
where not exists (select 1 from parametros p where p.clave = v.clave);

create table estudios_socioeconomicos (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references ninos(id),
  fecha_elaboracion date not null,
  trabajador_social text,
  documento_url text,
  observaciones text,
  registrado_por uuid references perfiles(id) default usuario_actual(),
  creado_en timestamptz not null default now(),
  check (fecha_elaboracion <= current_date)
);
create index on estudios_socioeconomicos (nino_id, fecha_elaboracion desc);
create trigger estudios_socioeconomicos_bitacora after insert or update or delete on estudios_socioeconomicos
  for each row execute function registrar_bitacora();
create trigger estudios_socioeconomicos_no_delete before delete on estudios_socioeconomicos
  for each row execute function bloquear_delete();
alter table estudios_socioeconomicos enable row level security;
-- Información delicada de la familia: la ven dirección, coordinación y auditoría (no el personal).
create policy estudios_socioeconomicos_lectura on estudios_socioeconomicos for select using (ve_notas_ninos());
create policy estudios_socioeconomicos_insert on estudios_socioeconomicos for insert with check (edita_ninos());
-- Un estudio registrado no se cambia: se registra el nuevo. Solo el superadministrador corrige.
create policy estudios_socioeconomicos_update on estudios_socioeconomicos for update using (es_superadmin()) with check (es_superadmin());

-- migrate:down

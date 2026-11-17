-- migrate:up
-- Gestión de usuarios desde el portal (solo admin). Las tablas del login (usuarios, cuentas, sesiones)
-- no son accesibles para app_portal: estas funciones security definer hacen lo justo y revisan es_admin().
-- La contraseña llega ya cifrada (scrypt de Better Auth) desde el servidor: la base nunca ve el texto.

create or replace function usuarios_portal()
returns table (id uuid, nombre text, correo text, rol rol_portal, activo boolean, acceso_hasta date, creado_en timestamptz, ultima_sesion timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo la dirección puede ver los usuarios.' using errcode = '42501';
  end if;
  return query
    select p.id, p.nombre, u.correo, p.rol, p.activo, p.acceso_hasta, p.creado_en,
           (select max(s.creado_en) from sesiones s where s.usuario_id = p.id)
    from perfiles p join usuarios u on u.id = p.id
    order by p.activo desc, p.nombre;
end $$;

create or replace function crear_usuario_portal(
  p_correo text, p_nombre text, p_rol rol_portal, p_hash text, p_acceso_hasta date default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_correo text := lower(trim(p_correo));
begin
  if not es_admin() then
    raise exception 'Solo la dirección puede crear usuarios.' using errcode = '42501';
  end if;
  if v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El correo "%" no es válido.', p_correo;
  end if;
  if p_rol = 'auditor' and p_acceso_hasta is null then
    raise exception 'Un auditor necesita una fecha de vencimiento del acceso.';
  end if;
  if exists (select 1 from usuarios where correo = v_correo) then
    raise exception 'Ya existe un usuario con el correo %.', v_correo;
  end if;
  insert into usuarios (nombre, correo, correo_verificado) values (trim(p_nombre), v_correo, true) returning id into v_id;
  insert into cuentas (usuario_id, cuenta_id, proveedor_id, contrasena) values (v_id, v_id::text, 'credential', p_hash);
  insert into perfiles (id, nombre, rol, acceso_hasta) values (v_id, trim(p_nombre), p_rol, p_acceso_hasta);
  return v_id;
end $$;

-- Sin correo (no hay SMTP) la dirección le asigna una contraseña temporal. Cierra sus sesiones abiertas.
create or replace function restablecer_contrasena_portal(p_usuario uuid, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo la dirección puede restablecer contraseñas.' using errcode = '42501';
  end if;
  update cuentas set contrasena = p_hash, actualizado_en = now() where usuario_id = p_usuario and proveedor_id = 'credential';
  if not found then raise exception 'Ese usuario no tiene contraseña de acceso.'; end if;
  delete from sesiones where usuario_id = p_usuario;
  insert into bitacora (tabla, registro_id, accion, despues)
  values ('cuentas', p_usuario::text, 'UPDATE', '{"contrasena": "restablecida por la dirección"}');
end $$;

-- Al desactivar a alguien (o vencer su acceso) se cierran sus sesiones al instante.
create or replace function cerrar_sesiones_si_pierde_acceso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.activo and not new.activo) or (new.acceso_hasta is not null and new.acceso_hasta < current_date) then
    delete from sesiones where usuario_id = new.id;
  end if;
  return new;
end $$;
create trigger perfiles_cerrar_sesiones after update on perfiles
  for each row execute function cerrar_sesiones_si_pierde_acceso();

-- Nadie se quita a sí mismo el rol de admin ni se desactiva (dejaría la fundación sin dirección en el portal).
create or replace function proteger_propio_perfil() returns trigger language plpgsql as $$
begin
  if old.id = usuario_actual() and (new.rol is distinct from old.rol or not new.activo or new.acceso_hasta is not null) then
    raise exception 'No puede cambiar su propio rol, desactivarse ni ponerse vencimiento. Pídaselo a otra persona con rol de dirección.';
  end if;
  return new;
end $$;
create trigger perfiles_proteger_propio before update on perfiles
  for each row execute function proteger_propio_perfil();

-- migrate:down

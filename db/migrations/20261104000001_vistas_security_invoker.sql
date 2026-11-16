-- migrate:up
-- Las vistas se crearon sin security_invoker. En Postgres 15+ eso hace que corran con los
-- permisos de su dueño y se salten el RLS de las tablas: cualquier rol que pudiera consultarlas
-- veía las alertas de activos y el saldo de inventario sin tener permiso.
-- Con security_invoker la vista aplica el RLS de quien consulta (puede_leer()).
alter view v_activos_alertas set (security_invoker = true);
alter view v_saldo_inventario set (security_invoker = true);

-- migrate:down

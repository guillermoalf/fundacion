-- migrate:up
-- Categorías de productos del inventario como lista editable (antes era un enum fijo).
-- "Quitar" una categoría = desactivarla: deja de ofrecerse, pero los productos que la usan la conservan.
-- `reporte` dice en cuál Formulario N.º 1 mensual salen sus productos (alimentos, aseo) o en ninguno.
create table categorias_producto (
  codigo text primary key check (codigo ~ '^[a-z0-9_]+$'),
  nombre text not null unique,
  reporte text not null default 'ninguno' check (reporte in ('alimentos', 'aseo', 'ninguno')),
  orden smallint not null default 100,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

insert into categorias_producto (codigo, nombre, reporte, orden) values
  ('perecedero', 'Alimentos perecederos (frutas, verduras, huevos…)', 'alimentos', 10),
  ('no_perecedero', 'Alimentos no perecederos', 'alimentos', 20),
  ('limpieza', 'Limpieza e higiene', 'aseo', 30),
  ('didactico', 'Material didáctico', 'ninguno', 40),
  ('oficina', 'Oficina (lápices, útiles…)', 'ninguno', 50),
  ('ferreteria', 'Artículos de ferretería', 'ninguno', 60),
  ('juguetes', 'Juguetes y recreación', 'ninguno', 70),
  ('electrodomesticos', 'Electrodomésticos de baja cuantía', 'ninguno', 80),
  ('otro', 'Otro (artículos de baja cuantía, etc.)', 'ninguno', 90);

create trigger categorias_producto_bitacora after insert or update or delete on categorias_producto
  for each row execute function registrar_bitacora();
create trigger categorias_producto_no_delete before delete on categorias_producto
  for each row execute function bloquear_delete();
alter table categorias_producto enable row level security;
create policy categorias_producto_lectura on categorias_producto for select using (puede_leer());
create policy categorias_producto_insert on categorias_producto for insert with check (es_admin());
create policy categorias_producto_update on categorias_producto for update using (es_admin()) with check (es_admin());

-- productos.categoria pasa de enum a texto con llave hacia la lista (los códigos no cambian).
drop view v_saldo_inventario;
alter table productos alter column categoria type text using categoria::text;
alter table productos add constraint productos_categoria_fkey foreign key (categoria) references categorias_producto(codigo);
drop type categoria_producto;

create view v_saldo_inventario with (security_invoker = true) as
select p.id as producto_id, p.nombre, p.categoria, p.unidad, p.stock_minimo,
       coalesce(sum(case when m.tipo = 'entrada' then m.cantidad
                         when m.tipo = 'ajuste' then m.cantidad
                         else -m.cantidad end), 0) as saldo
from productos p
left join inventario_movimientos m on m.producto_id = p.id
group by p.id;

-- Una categoría desactivada no se asigna a productos nuevos ni a un cambio de categoría.
create or replace function validar_categoria_producto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' or new.categoria is distinct from old.categoria)
     and not exists (select 1 from categorias_producto where codigo = new.categoria and activo) then
    raise exception 'La categoría elegida ya no se usa. Elija otra de la lista.';
  end if;
  return new;
end $$;
create trigger productos_validar_categoria before insert or update on productos
  for each row execute function validar_categoria_producto();

-- migrate:down

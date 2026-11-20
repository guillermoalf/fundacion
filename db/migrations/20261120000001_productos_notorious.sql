-- migrate:up
-- Productos que se le compran a Notorious Fruits (pedido semanal de frutas y verduras). Solo el catálogo:
-- sin cantidades. Si ya existe un producto con el mismo nombre (sin importar tildes ni mayúsculas) no se repite;
-- solo se le pone Notorious como proveedor habitual si no tenía.
do $$
declare
  v_prov int := (select id from proveedores where lower(nombre) like '%notorious%' order by id limit 1);
  p record;
  v_id int;
begin
  for p in select * from (values
    ('Uvas', 'kg', 'frutas_verduras'), ('Fresas', 'kg', 'frutas_verduras'), ('Huevos', 'cartón', 'huevos'),
    ('Banano', 'unidad', 'frutas_verduras'), ('Sandía', 'kg', 'frutas_verduras'), ('Papaya', 'kg', 'frutas_verduras'),
    ('Melón', 'kg', 'frutas_verduras'), ('Manzana', 'unidad', 'frutas_verduras'), ('Repollo', 'kg', 'frutas_verduras'),
    ('Plátano pintón', 'racimo', 'frutas_verduras'), ('Plátano maduro', 'racimo', 'frutas_verduras'), ('Papa', 'kg', 'frutas_verduras'),
    ('Zanahoria', 'kg', 'frutas_verduras'), ('Lechuga', 'unidad', 'frutas_verduras'), ('Frijoles rojos', 'kg', 'no_perecedero'),
    ('Mandarina', 'unidad', 'frutas_verduras'), ('Culantro coyote', 'rollo de 10', 'frutas_verduras'), ('Culantro castilla', 'rollo de 10', 'frutas_verduras'),
    ('Maracuyá', 'kg', 'frutas_verduras'), ('Chile dulce', 'unidad', 'frutas_verduras'), ('Cebolla', 'kg', 'frutas_verduras'),
    ('Manga', 'kg', 'frutas_verduras'), ('Piña', 'unidad', 'frutas_verduras'), ('Tomate', 'kg', 'frutas_verduras'),
    ('Yuca', 'kg', 'frutas_verduras'), ('Tiquisque', 'kg', 'frutas_verduras'), ('Camote', 'kg', 'frutas_verduras'), ('Elote', 'unidad', 'frutas_verduras')
  ) as t(nombre, unidad, categoria) loop
    select id into v_id from productos
    where translate(lower(trim(nombre)), 'áéíóúü', 'aeiouu') = translate(lower(p.nombre), 'áéíóúü', 'aeiouu')
    order by activo desc, id limit 1;
    if v_id is null then
      insert into productos (nombre, categoria, unidad, proveedor_habitual_id) values (p.nombre, p.categoria, p.unidad, v_prov);
    elsif v_prov is not null then
      update productos set proveedor_habitual_id = v_prov where id = v_id and proveedor_habitual_id is null;
    end if;
  end loop;
end $$;

-- migrate:down

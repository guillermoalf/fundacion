-- migrate:up
-- 1) IVA por línea de compra: el precio de cada producto se muestra con IVA.
--    Si la factura electrónica trae el IVA de cada línea se guarda tal cual; si no, se reparte el IVA
--    de la factura en proporción al monto de cada línea (mismo cálculo que src/lib/calculos/precios.ts).
alter table compra_lineas add column iva_linea numeric(14,2) check (iva_linea >= 0);

with base as (
  select l.id, l.compra_id, l.total_linea, c.iva,
         sum(l.total_linea) over (partition by l.compra_id) as suma,
         row_number() over (partition by l.compra_id order by l.total_linea desc, l.id) as n
  from compra_lineas l join compras c on c.id = l.compra_id
), repartido as (
  select id, compra_id, n, iva,
         case when suma > 0 then round(iva * total_linea / suma, 2) else 0 end as parte
  from base
), ajuste as (
  -- Lo que sobra o falta por redondeo va a la línea más grande, para que la suma dé exacto el IVA de la factura.
  select compra_id, max(iva) - sum(parte) as resto from repartido group by compra_id
)
update compra_lineas l
set iva_linea = r.parte + case when r.n = 1 then a.resto else 0 end
from repartido r join ajuste a on a.compra_id = r.compra_id
where l.id = r.id;

-- Historial de precios de cada producto (una fila por línea de compra).
create view v_precios_producto with (security_invoker = true) as
select l.id as linea_id, l.producto_id, c.id as compra_id, c.fecha, c.numero_factura, pr.id as proveedor_id, pr.nombre as proveedor,
       l.cantidad, l.unidad, l.precio_unitario,
       round(coalesce(l.iva_linea, 0) / l.cantidad, 2) as iva_unitario,
       round((l.total_linea + coalesce(l.iva_linea, 0)) / l.cantidad, 2) as precio_con_iva,
       c.creado_en
from compra_lineas l
join compras c on c.id = l.compra_id
join proveedores pr on pr.id = c.proveedor_id
where l.producto_id is not null;

-- 2) Categorías de alimentos más detalladas. Los productos perecederos que ya existen se reclasifican por su
--    nombre (queda en la bitácora); lo que no se reconoce sigue en «Alimentos perecederos».
update categorias_producto set nombre = 'Alimentos perecederos', orden = 18 where codigo = 'perecedero';
update categorias_producto set orden = 19 where codigo = 'no_perecedero';
insert into categorias_producto (codigo, nombre, reporte, orden) values
  ('frutas_verduras', 'Verduras y frutas', 'alimentos', 10),
  ('huevos', 'Huevos', 'alimentos', 11),
  ('lacteos', 'Lácteos', 'alimentos', 12),
  ('pollo', 'Pollo', 'alimentos', 13),
  ('carnes', 'Carnes', 'alimentos', 14),
  ('pescado', 'Pescado', 'alimentos', 15),
  ('embutidos', 'Embutidos', 'alimentos', 16);

update productos set categoria = case
    when nombre ~* '(salchich|jam[oó]n|mortadela|chorizo|salami|tocineta|tocino)' then 'embutidos'
    when nombre ~* 'huevo' then 'huevos'
    when nombre ~* '(leche|queso|yogur|natilla|crema dulce|mantequilla|reques[oó]n|lacteo|lácteo)' then 'lacteos'
    when nombre ~* '(pollo|pechuga|muslo|alita)' then 'pollo'
    when nombre ~* '(pescado|tilapia|corvina|camar[oó]n|marisco|filete de pesc)' then 'pescado'
    when nombre ~* '(carne|\mres\M|cerdo|chuleta|costilla|molida|bistec|lomo|posta)' then 'carnes'
    when nombre ~* '(fruta|verdura|banano|manzana|papaya|pi[nñ]a|mel[oó]n|sand[ií]a|naranja|mango|lim[oó]n|fresa|uva|pera|tomate|lechuga|cebolla|\mpapa|zanahoria|chayote|ayote|br[oó]coli|coliflor|repollo|pepino|culantro|chile|apio|vainica|elote|pl[aá]tano|yuca|camote|aguacate|\majo\M)' then 'frutas_verduras'
    else categoria end
where categoria = 'perecedero';

-- 3) Preferencias de cada usuario en las listas (columnas y orden): solo las ve y cambia su dueño.
create table preferencias_tabla (
  usuario_id uuid not null references perfiles(id) default usuario_actual(),
  tabla text not null,
  config jsonb not null,
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, tabla)
);
create trigger preferencias_tabla_no_delete before delete on preferencias_tabla
  for each row execute function bloquear_delete();
alter table preferencias_tabla enable row level security;
create policy preferencias_tabla_lectura on preferencias_tabla for select using (usuario_id = usuario_actual());
create policy preferencias_tabla_insert on preferencias_tabla for insert with check (usuario_id = usuario_actual() and rol_actual() is not null);
create policy preferencias_tabla_update on preferencias_tabla for update using (usuario_id = usuario_actual()) with check (usuario_id = usuario_actual());

-- migrate:down

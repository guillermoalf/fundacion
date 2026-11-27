-- migrate:up
-- Reportes de todo tipo (decisión 27/11/2026): las listas de Activos e Inventario quedan completas y cada reporte
-- decide qué entra. Tipos: activos (Auxiliar de activos fijos o conteo por aula y estado), compras (lo comprado en un
-- período: por proveedor, categoría, fondo) e inventario (saldo inicial, entradas, salidas y saldo final).
alter table reportes_activos rename to reportes;
alter table reportes add column tipo text not null default 'activos' check (tipo in ('activos', 'compras', 'inventario'));

-- Categorías de activos que la fundación no usa (se retiran: los activos que ya las tienen las conservan).
update categorias_activo set activa = false where nombre in (
  'Alfombras', 'Aspiradoras', 'Amplificadores (fotografía y sonido)', 'Baterías de cocina', 'Bibliotecas (mobiliario y equipo)',
  'Bicicletas', 'Calculadoras (todo tipo)', 'Calentadores de agua', 'Cámaras de televisión', 'Cámaras fotográficas', 'Camas',
  'Carruseles (caballitos, ruedas de chicago, carros chocones, toboganes y similares)', 'Cortinas para todo uso',
  'Equipo de iluminación', 'Equipo de lavandería', 'Equipo médico', 'Equipo de proyección y sonido (T.V.)', 'Estufas',
  'Exhibidores', 'Extractores de aire', 'Fotocopiadoras');

-- Nuevas, con la tasa y la vida útil de la fila del Anexo 2 que les corresponde.
insert into categorias_activo (nombre, tasa_anual, anios_vida, palabras_clave, referencia)
select v.nombre, b.tasa_anual, b.anios_vida, v.claves, b.referencia
from (values
  ('Lavadoras', 'Equipo de lavandería', array['lavadora', 'secadora']::text[]),
  ('Televisores', 'Equipo de proyección y sonido (T.V.)', array['televisor', 'tv', 'pantalla', 'smart tv']::text[]),
  ('Proyectores', 'Equipo de proyección y sonido (T.V.)', array['proyector', 'video beam', 'videobeam']::text[])
) v(nombre, base, claves)
join categorias_activo b on b.nombre = v.base
where not exists (select 1 from categorias_activo c where c.nombre = v.nombre);

-- migrate:down

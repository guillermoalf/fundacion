-- migrate:up
-- Niños privados: pagan mensualidad, sin subsidio. Es una marca del niño, no una fuente de dinero
-- (así no aparece al escoger con qué se pagó una compra o un salario). No se registra el monto.
alter table ninos add column privado boolean not null default false;
alter table ninos add constraint ninos_privado_sin_subsidio check (not privado or fuente_id is null);

-- migrate:down

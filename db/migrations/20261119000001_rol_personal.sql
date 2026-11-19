-- migrate:up
-- Rol "Personal" (maestras, asistentes, cuidadoras): solo pasa lista y ve los contactos de los niños.
-- Va solo: un valor nuevo de enum no se puede usar en la misma transacción.
alter type rol_portal add value if not exists 'personal';

-- migrate:down

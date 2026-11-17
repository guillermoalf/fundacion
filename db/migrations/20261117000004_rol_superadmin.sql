-- migrate:up
-- Rol "Superadministrador" (va solo: un valor nuevo de enum no se puede usar en la misma transacción).
alter type rol_portal add value if not exists 'superadmin';

-- migrate:down

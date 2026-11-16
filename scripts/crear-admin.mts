/**
 * Crea el primer usuario administrador (rol admin) del portal.
 *
 * Se conecta como dueño de la base (se salta el RLS): crea el usuario del login, su contraseña
 * y su fila en `perfiles`, todo en una transacción. Es la única escritura que queda en la bitácora
 * sin usuario (no hay sesión todavía). Por eso se niega si ya existe un admin, salvo que se pase --otro.
 *
 * Uso: npm run crear-admin -- correo@ejemplo.com "Nombre Apellido"
 *   Local: toma DATABASE_URL de .env.local.
 *   Neon:  DATABASE_URL="<cadena de conexión de Neon>" npm run crear-admin -- ...
 *          (las variables del entorno tienen prioridad sobre .env.local)
 */
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2).filter((a) => a !== "--");
const otro = args.includes("--otro");
const [correoArg, nombre] = args.filter((a) => !a.startsWith("--"));
if (!correoArg || !nombre) {
  console.error('Uso: npm run crear-admin -- correo@ejemplo.com "Nombre Apellido"');
  process.exit(1);
}
const correo = correoArg.trim().toLowerCase();

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (en .env.local o en el entorno).");
  process.exit(1);
}

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from perfiles where rol = 'admin'");
  if (rows[0].n && !otro) {
    console.error(`Ya existe ${rows[0].n === 1 ? "un admin" : `${rows[0].n} admins`}. Si de verdad necesita otro desde aquí, agregue --otro.`);
    process.exit(1);
  }
  const existe = await db.query("select 1 from usuarios where correo = $1", [correo]);
  if (existe.rowCount) {
    console.error(`Ya existe un usuario con el correo ${correo}.`);
    process.exit(1);
  }

  const contrasena = randomBytes(12).toString("base64url");
  const hash = await hashPassword(contrasena);

  await db.query("begin");
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into usuarios (nombre, correo, correo_verificado) values ($1, $2, true) returning id",
    [nombre, correo],
  );
  // Better Auth guarda la contraseña en `cuentas` con proveedor 'credential' y cuenta_id = id del usuario.
  await db.query("insert into cuentas (usuario_id, cuenta_id, proveedor_id, contrasena) values ($1::uuid, $1::text, 'credential', $2)", [id, hash]);
  await db.query("insert into perfiles (id, nombre, rol) values ($1, $2, 'admin')", [id, nombre]);
  await db.query("commit");

  console.log(`Admin creado: ${nombre} <${correo}>`);
  console.log(`Contraseña temporal: ${contrasena}`);
  console.log("Entréguela en persona y no la guarde en ningún otro lado. Se cambia en Portal → Mi cuenta.");
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error("No se pudo crear el admin:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await db.end();
}

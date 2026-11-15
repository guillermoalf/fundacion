/**
 * Crea el primer usuario administrador (rol admin) del portal.
 *
 * Usa la service_role, que se salta el RLS: crea el usuario en Supabase Auth y su fila en `perfiles`.
 * Es la única escritura que queda en la bitácora sin usuario (no hay sesión todavía).
 * Por eso se niega si ya existe un admin, salvo que se pase --otro.
 *
 * Uso: npm run crear-admin -- correo@ejemplo.com "Nombre Apellido"
 *   Local: toma la URL y la clave de .env.local.
 *   Nube: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run crear-admin -- ...
 *         (las variables del entorno tienen prioridad sobre .env.local)
 */
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/tipos.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2).filter((a) => a !== "--");
const otro = args.includes("--otro");
const [correo, nombre] = args.filter((a) => !a.startsWith("--"));
if (!correo || !nombre) {
  console.error('Uso: npm run crear-admin -- correo@ejemplo.com "Nombre Apellido"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en .env.local o en el entorno).");
  process.exit(1);
}

const db = createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: errorConteo } = await db.from("perfiles").select("id", { count: "exact", head: true }).eq("rol", "admin");
if (errorConteo) {
  console.error("No se pudo consultar perfiles:", errorConteo.message);
  process.exit(1);
}
if (count && !otro) {
  console.error(`Ya existe ${count === 1 ? "un admin" : `${count} admins`}. Si de verdad necesita otro desde aquí, agregue --otro.`);
  process.exit(1);
}

const contrasena = randomBytes(12).toString("base64url");
const { data, error } = await db.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true });
if (error) {
  console.error("No se pudo crear el usuario:", error.message);
  process.exit(1);
}

const { error: errorPerfil } = await db.from("perfiles").insert({ id: data.user.id, nombre, rol: "admin" });
if (errorPerfil) {
  // Sin perfil el usuario no sirve: se elimina de Auth (perfiles no se borra, pero aquí no se llegó a crear).
  await db.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo crear el perfil:", errorPerfil.message);
  process.exit(1);
}

console.log(`Admin creado: ${nombre} <${correo}>`);
console.log(`Contraseña temporal: ${contrasena}`);
console.log("Entréguela en persona y no la guarde en ningún otro lado.");

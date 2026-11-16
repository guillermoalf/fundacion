/**
 * Login del portal (Better Auth): correo y contraseña, sesiones en la tabla `sesiones` de la misma base.
 * No hay registro público: los usuarios los crea el admin (por ahora con `npm run crear-admin`).
 * No se expone ninguna ruta /api/auth: el portal llama a `auth.api.*` desde Server Actions y
 * `nextCookies()` escribe la cookie de sesión.
 */
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db/conexion";

const fechas = { createdAt: "creado_en", updatedAt: "actualizado_en" };

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  telemetry: { enabled: false },
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10, maxPasswordLength: 128 },
  // La sesión dura 7 días y se renueva sola si la directora entra al menos una vez al día.
  session: {
    modelName: "sesiones",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    fields: { ...fechas, userId: "usuario_id", expiresAt: "expira_en", ipAddress: "ip", userAgent: "navegador" },
  },
  user: {
    modelName: "usuarios",
    fields: { ...fechas, name: "nombre", email: "correo", emailVerified: "correo_verificado", image: "imagen" },
  },
  account: {
    modelName: "cuentas",
    fields: {
      ...fechas,
      userId: "usuario_id",
      accountId: "cuenta_id",
      providerId: "proveedor_id",
      password: "contrasena",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expira_en",
      refreshTokenExpiresAt: "refresh_token_expira_en",
    },
  },
  verification: {
    modelName: "verificaciones",
    fields: { ...fechas, identifier: "identificador", value: "valor", expiresAt: "expira_en" },
  },
  plugins: [nextCookies()],
});

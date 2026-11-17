import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // El sitio usa <img> con imports estáticos para verse igual que antes de la migración.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Núcleo del portal (integrado tal cual, con tests): usa `any` a propósito en los
    // tipos de ExcelJS y en los tests de guardar.ts. El código nuevo sí aplica la regla.
    files: ["src/lib/{calculos,catalogos,importacion,export}/**", "scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // La conexión del dueño se salta el RLS y la bitácora: el portal entra a la base solo por conUsuario().
    files: ["src/**"],
    ignores: ["src/lib/db/conexion.ts", "src/lib/db/index.ts", "src/lib/auth.ts", "src/lib/kiosko.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/db/conexion", "**/db/conexion"], message: "Use conUsuario() de @/lib/db (u obtenerSesion().consultar): así aplica el RLS y la bitácora." },
            { group: ["pg"], message: "Use conUsuario() de @/lib/db: así aplica el RLS y la bitácora." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

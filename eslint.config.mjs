import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "supabase/.temp/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // El sitio usa <img> con imports estáticos para verse igual que antes de la migración.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Núcleo del portal (integrado tal cual, con tests): usa `any` a propósito en los
    // tipos de ExcelJS y en el cliente mínimo de guardar.ts. El código nuevo sí aplica la regla.
    files: ["src/lib/{calculos,catalogos,importacion,export}/**", "scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];

export default eslintConfig;

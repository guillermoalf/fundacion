import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // _core/ es el portal interno; se integra en otro paso.
  { ignores: ["_core/**", ".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // El sitio usa <img> con imports estáticos para verse igual que antes de la migración.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;

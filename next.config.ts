import type { NextConfig } from "next";

// Los redirects de URLs con mayúscula (/Nosotros → /nosotros) y de /admin
// viven en src/middleware.ts: los redirects de next.config no distinguen
// mayúsculas, así que /nosotros se redirigiría a sí misma.
const nextConfig: NextConfig = {
  // El logo que lleva el control de limpieza (Word) se lee del disco en el servidor.
  outputFileTracingIncludes: { "/portal/reportes/inventario/descargar": ["./src/assets/logo-secundario.png"] },
  experimental: {
    // Fotos de facturas y boletas (ya comprimidas en el navegador) y archivos de Excel.
    // Vercel acepta hasta 4,5 MB por petición.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Los redirects de URLs con mayúscula (/Nosotros → /nosotros) y de /admin
// viven en src/middleware.ts: los redirects de next.config no distinguen
// mayúsculas, así que /nosotros se redirigiría a sí misma.
const nextConfig: NextConfig = {};

export default nextConfig;

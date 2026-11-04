import type { Metadata } from "next";

// Ruta reservada para el portal interno (Supabase). Vacía y sin enlaces desde el sitio.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalPage() {
  return null;
}

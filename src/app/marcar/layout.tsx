import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Marcar asistencia · Creciendo Feliz", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function KioskoLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen select-none bg-sky-50 text-slate-900 antialiased">{children}</div>;
}

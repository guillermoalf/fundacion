import type { Metadata } from "next";
import type { ReactNode } from "react";

// El portal no hereda los estilos de la landing (viven en app/(sitio)/layout); solo usa Tailwind.
export const metadata: Metadata = {
  title: { default: "Portal · Creciendo Feliz", template: "%s · Portal Creciendo Feliz" },
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</div>;
}

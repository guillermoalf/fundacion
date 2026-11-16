import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/portal/sesion";
import logo from "@/assets/logo-secundario.png";
import FormularioLogin from "./FormularioLogin";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;
  // Con una sesión válida no tiene sentido el login. (El middleware solo ve si hay cookie, no si sirve.)
  if (await obtenerUsuario()) redirect("/portal");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo.src} alt="Fundación Creciendo Feliz" className="h-24 w-auto" />
          <h1 className="mt-4 text-xl font-semibold">Portal administrativo</h1>
          <p className="mt-1 text-sm text-slate-500">Solo para el personal de administración.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <FormularioLogin siguiente={siguiente ?? "/portal"} />
        </div>
      </div>
    </main>
  );
}

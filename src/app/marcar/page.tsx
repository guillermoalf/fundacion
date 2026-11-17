import { cookies } from "next/headers";
import { COOKIE_KIOSKO, dispositivoPorToken, personalParaKiosko } from "@/lib/kiosko";
import Kiosko from "./Kiosko";

export const dynamic = "force-dynamic";

export default async function MarcarPage() {
  const dispositivo = await dispositivoPorToken((await cookies()).get(COOKIE_KIOSKO)?.value);
  if (!dispositivo) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow">
          <h1 className="text-3xl font-bold">Esta tablet no está registrada</h1>
          <p className="mt-4 text-xl text-slate-600">
            Para usarla como kiosko de asistencia, la dirección debe entrar al portal en esta misma tablet y registrarla en
            <strong> Kiosko de asistencia → Registrar esta tablet</strong>.
          </p>
        </div>
      </main>
    );
  }
  const personal = await personalParaKiosko();
  return <Kiosko personal={personal.map((p) => ({ id: p.id, nombre: p.nombre, foto: !!p.foto_url }))} />;
}

import { createBrowserClient } from "@supabase/ssr";

/** Cliente para componentes de cliente. Usa la sesión del usuario: RLS y bitácora lo identifican. */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

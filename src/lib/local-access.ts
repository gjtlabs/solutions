import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import type { Membresia } from "@/lib/auth";

// Cada pantalla y cada Server Action bajo /tpv/[localId] llama a esto para
// comprobar que el usuario de la sesión tiene una membresía en ESE local
// concreto — no basta con estar autenticado, un camarero de un bar no debe
// poder ver ni tocar los datos de otro.
export async function requireLocalAccess(localId: string) {
  const session = await requireSession();
  const membresia = session.user.membresias.find((m) => m.localId === localId);

  if (!membresia) {
    notFound();
  }

  return { session, membresia: membresia as Membresia };
}

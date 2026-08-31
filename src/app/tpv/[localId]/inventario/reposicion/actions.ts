"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { confirmarLineaReposicion, generarReposicionManual } from "@/lib/inventario";

export async function confirmarLinea(localId: string, lineaId: string, cantidadLlevada: number) {
  await requireLocalAccess(localId);
  await confirmarLineaReposicion(localId, lineaId, cantidadLlevada);
  revalidatePath(`/tpv/${localId}/inventario/reposicion`);
  revalidatePath(`/tpv/${localId}/inventario`);
}

export async function generarAhora(localId: string) {
  await requireLocalAccess(localId);
  await generarReposicionManual(localId);
  revalidatePath(`/tpv/${localId}/inventario/reposicion`);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type RecetaFormState = { error?: string } | undefined;

// El escandallo es lo que liga de verdad un producto de carta con las
// referencias de inventario: sin al menos una línea aquí, cobrar ese
// producto no descuenta ningún stock — Producto (lo que se vende) e
// Ingrediente (lo que se compra y almacena) son cosas distintas a
// propósito, porque un mismo producto puede consumir varias referencias
// en cantidades distintas (p. ej. un cubalibre = ron + refresco).
export async function anadirLineaReceta(
  localId: string,
  productoId: string,
  _prevState: RecetaFormState,
  formData: FormData,
): Promise<RecetaFormState> {
  await requireLocalAccess(localId);

  const ingredienteId = String(formData.get("ingredienteId") ?? "");
  const cantidad = Number(formData.get("cantidad"));

  if (!ingredienteId) {
    return { error: "Elige una referencia." };
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un número mayor que 0." };
  }

  await prisma.recetaLinea.upsert({
    where: { productoId_ingredienteId: { productoId, ingredienteId } },
    create: { productoId, ingredienteId, cantidad },
    update: { cantidad },
  });

  revalidatePath(`/tpv/${localId}/productos/${productoId}`);
  return undefined;
}

export async function quitarLineaReceta(localId: string, productoId: string, lineaId: string) {
  await requireLocalAccess(localId);
  await prisma.recetaLinea.delete({ where: { id: lineaId, productoId } });
  revalidatePath(`/tpv/${localId}/productos/${productoId}`);
}

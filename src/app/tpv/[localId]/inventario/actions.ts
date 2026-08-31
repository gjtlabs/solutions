"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type IngredienteFormState = { error?: string } | undefined;

export async function crearIngrediente(
  localId: string,
  _prevState: IngredienteFormState,
  formData: FormData,
): Promise<IngredienteFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const unidadMedida = String(formData.get("unidadMedida") ?? "").trim();
  const stockMinimoBarra = Number(formData.get("stockMinimoBarra"));
  const stockMaximoBarra = Number(formData.get("stockMaximoBarra"));
  const costeUnitario = Number(formData.get("costeUnitario"));

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }
  if (!unidadMedida) {
    return { error: "La unidad de medida es obligatoria." };
  }
  if (!Number.isFinite(stockMinimoBarra) || stockMinimoBarra < 0) {
    return { error: "El mínimo en barra tiene que ser un número mayor o igual que 0." };
  }
  if (!Number.isFinite(stockMaximoBarra) || stockMaximoBarra < stockMinimoBarra) {
    return { error: "El máximo en barra tiene que ser mayor o igual que el mínimo." };
  }

  await prisma.ingrediente.create({
    data: {
      localId,
      nombre,
      unidadMedida,
      stockMinimoBarra,
      stockMaximoBarra,
      costeUnitario: Number.isFinite(costeUnitario) && costeUnitario >= 0 ? costeUnitario : 0,
    },
  });

  revalidatePath(`/tpv/${localId}/inventario`);
  return undefined;
}

export async function actualizarParesBarra(
  localId: string,
  ingredienteId: string,
  stockMinimoBarra: number,
  stockMaximoBarra: number,
) {
  await requireLocalAccess(localId);
  if (!Number.isFinite(stockMinimoBarra) || stockMinimoBarra < 0) return;
  if (!Number.isFinite(stockMaximoBarra) || stockMaximoBarra < stockMinimoBarra) return;

  await prisma.ingrediente.update({
    where: { id: ingredienteId },
    data: { stockMinimoBarra, stockMaximoBarra },
  });
  revalidatePath(`/tpv/${localId}/inventario`);
}

// Corrección manual de stock — rotura, caducidad, un recuento que no
// cuadraba... Positivo suma, negativo resta; siempre queda registrado como
// MERMA para no mezclarse con las entradas de proveedor ni las ventas.
export async function ajustarStock(
  localId: string,
  ingredienteId: string,
  ubicacion: "ALMACEN" | "BARRA",
  cantidad: number,
) {
  await requireLocalAccess(localId);
  if (!Number.isFinite(cantidad) || cantidad === 0) return;

  const campo = ubicacion === "ALMACEN" ? "stockAlmacen" : "stockBarra";
  await prisma.$transaction([
    prisma.ingrediente.update({
      where: { id: ingredienteId },
      data: { [campo]: { increment: cantidad } },
    }),
    prisma.movimientoStock.create({
      data: {
        ingredienteId,
        tipo: "MERMA",
        cantidad: Math.abs(cantidad),
        referencia: `ajuste:${ubicacion.toLowerCase()}:${cantidad > 0 ? "suma" : "resta"}`,
      },
    }),
  ]);
  revalidatePath(`/tpv/${localId}/inventario`);
}

export async function borrarIngrediente(localId: string, ingredienteId: string) {
  await requireLocalAccess(localId);
  const enUso = await prisma.recetaLinea.count({ where: { ingredienteId } });
  if (enUso > 0) return; // la UI ya oculta el botón en este caso — defensa extra
  await prisma.ingrediente.delete({ where: { id: ingredienteId } });
  revalidatePath(`/tpv/${localId}/inventario`);
}

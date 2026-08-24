"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type ProductoFormState = { error?: string } | undefined;

// Alta rápida de productos para poder probar comandas antes de que exista
// la gestión completa de la carta (categorías, orden, QR — Fase 2). Todo lo
// que se da de alta aquí cae en una categoría "General" única.
async function categoriaGeneral(localId: string) {
  const existente = await prisma.categoriaCarta.findFirst({
    where: { localId, nombre: "General" },
  });
  if (existente) return existente;
  return prisma.categoriaCarta.create({
    data: { localId, nombre: "General", orden: 0 },
  });
}

export async function crearProducto(
  localId: string,
  _prevState: ProductoFormState,
  formData: FormData,
): Promise<ProductoFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const precioVenta = Number(formData.get("precioVenta"));

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }
  if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
    return { error: "El precio tiene que ser un número mayor que 0." };
  }

  const categoria = await categoriaGeneral(localId);

  await prisma.producto.create({
    data: { localId, categoriaId: categoria.id, nombre, precioVenta },
  });

  revalidatePath(`/tpv/${localId}/productos`);
  return undefined;
}

export async function borrarProducto(localId: string, productoId: string) {
  await requireLocalAccess(localId);
  await prisma.producto.delete({ where: { id: productoId } });
  revalidatePath(`/tpv/${localId}/productos`);
}

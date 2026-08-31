"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type ProveedorFormState = { error?: string } | undefined;

export async function crearProveedor(
  localId: string,
  _prevState: ProveedorFormState,
  formData: FormData,
): Promise<ProveedorFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const contacto = String(formData.get("contacto") ?? "").trim() || null;
  const productosHabituales = String(formData.get("productosHabituales") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  await prisma.proveedor.create({
    data: { localId, nombre, contacto, productosHabituales },
  });

  revalidatePath(`/tpv/${localId}/proveedores`);
  return undefined;
}

export async function actualizarProveedor(
  localId: string,
  proveedorId: string,
  nombre: string,
  contacto: string,
  productosHabituales: string,
) {
  await requireLocalAccess(localId);
  const limpio = nombre.trim();
  if (!limpio) return;

  await prisma.proveedor.update({
    where: { id: proveedorId, localId },
    data: {
      nombre: limpio,
      contacto: contacto.trim() || null,
      productosHabituales: productosHabituales.trim() || null,
    },
  });
  revalidatePath(`/tpv/${localId}/proveedores`);
}

export async function borrarProveedor(localId: string, proveedorId: string) {
  await requireLocalAccess(localId);
  const pedidos = await prisma.pedidoProveedor.count({ where: { proveedorId } });
  if (pedidos > 0) return; // la UI ya oculta el botón en este caso — defensa extra
  await prisma.proveedor.delete({ where: { id: proveedorId } });
  revalidatePath(`/tpv/${localId}/proveedores`);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type MesaFormState = { error?: string } | undefined;

export async function crearMesa(
  localId: string,
  _prevState: MesaFormState,
  formData: FormData,
): Promise<MesaFormState> {
  await requireLocalAccess(localId);

  const zona = String(formData.get("zona") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const capacidad = Number(formData.get("capacidad"));

  if (!zona || !numero) {
    return { error: "Zona y número son obligatorios." };
  }
  if (!Number.isFinite(capacidad) || capacidad < 1) {
    return { error: "La capacidad tiene que ser un número mayor que 0." };
  }

  try {
    await prisma.mesa.create({
      data: { localId, zona, numero, capacidad },
    });
  } catch {
    return { error: `Ya existe una mesa "${numero}" en la zona "${zona}".` };
  }

  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
  return undefined;
}

export async function borrarMesa(localId: string, mesaId: string) {
  await requireLocalAccess(localId);
  await prisma.mesa.delete({ where: { id: mesaId } });
  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

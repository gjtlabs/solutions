"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Zonas
// ---------------------------------------------------------------------------

export type ZonaFormState = { error?: string } | undefined;

export async function crearZona(
  localId: string,
  _prevState: ZonaFormState,
  formData: FormData,
): Promise<ZonaFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  const orden = await prisma.zona.count({ where: { localId } });

  try {
    await prisma.zona.create({ data: { localId, nombre, orden } });
  } catch {
    return { error: `Ya existe una zona "${nombre}".` };
  }

  revalidatePath(`/tpv/${localId}/mesas`);
  return undefined;
}

export async function renombrarZona(localId: string, zonaId: string, nombre: string) {
  await requireLocalAccess(localId);
  const limpio = nombre.trim();
  if (!limpio) return;
  await prisma.zona.update({ where: { id: zonaId }, data: { nombre: limpio } });
  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

export async function borrarZona(localId: string, zonaId: string) {
  await requireLocalAccess(localId);
  const mesas = await prisma.mesa.count({ where: { zonaId } });
  if (mesas > 0) return; // la UI ya oculta el botón en este caso — defensa extra
  await prisma.zona.delete({ where: { id: zonaId } });
  revalidatePath(`/tpv/${localId}/mesas`);
}

export async function reordenarZona(
  localId: string,
  zonaId: string,
  direccion: "arriba" | "abajo",
) {
  await requireLocalAccess(localId);

  const zonas = await prisma.zona.findMany({
    where: { localId },
    orderBy: { orden: "asc" },
  });
  const i = zonas.findIndex((z) => z.id === zonaId);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= zonas.length) return;

  await prisma.$transaction([
    prisma.zona.update({ where: { id: zonas[i].id }, data: { orden: zonas[j].orden } }),
    prisma.zona.update({ where: { id: zonas[j].id }, data: { orden: zonas[i].orden } }),
  ]);

  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

// ---------------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------------

export type MesaFormState = { error?: string } | undefined;

export async function crearMesa(
  localId: string,
  _prevState: MesaFormState,
  formData: FormData,
): Promise<MesaFormState> {
  await requireLocalAccess(localId);

  const zonaId = String(formData.get("zonaId") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const capacidad = Number(formData.get("capacidad"));

  if (!zonaId || !numero) {
    return { error: "Zona y número son obligatorios." };
  }
  if (!Number.isFinite(capacidad) || capacidad < 1) {
    return { error: "La capacidad tiene que ser un número mayor que 0." };
  }

  // Coloca la mesa nueva en cascada dentro de su zona para que no se
  // amontonen todas en el centro — el usuario las reordena arrastrando
  // en el plano.
  const enZona = await prisma.mesa.count({ where: { zonaId } });
  const posicionX = 15 + (enZona % 5) * 18;
  const posicionY = 15 + Math.floor(enZona / 5) * 25;

  try {
    await prisma.mesa.create({
      data: { localId, zonaId, numero, capacidad, posicionX, posicionY },
    });
  } catch {
    return { error: `Ya existe una mesa "${numero}" en esa zona.` };
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

export async function moverMesa(
  localId: string,
  mesaId: string,
  posicionX: number,
  posicionY: number,
) {
  await requireLocalAccess(localId);
  const x = Math.min(97, Math.max(3, posicionX));
  const y = Math.min(95, Math.max(5, posicionY));
  await prisma.mesa.update({
    where: { id: mesaId },
    data: { posicionX: x, posicionY: y },
  });
  revalidatePath(`/tpv/${localId}`);
}

export async function actualizarEstiloMesa(
  localId: string,
  mesaId: string,
  forma: "REDONDA" | "RECTANGULAR",
  ancho: number,
  alto: number,
) {
  await requireLocalAccess(localId);
  await prisma.mesa.update({
    where: { id: mesaId },
    data: {
      forma,
      ancho: Math.min(200, Math.max(50, Math.round(ancho))),
      alto: Math.min(200, Math.max(50, Math.round(alto))),
    },
  });
  revalidatePath(`/tpv/${localId}`);
}

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { tagLocal } from "@/lib/cache-datos";

const TEMAS = ["CLARO", "OSCURO"] as const;
const COLORES_MARCA = ["VERDE", "AZUL", "TERRACOTA", "GRANATE", "PIZARRA"] as const;

export async function actualizarTema(localId: string, tema: string) {
  await requireLocalAccess(localId);
  if (!TEMAS.includes(tema as (typeof TEMAS)[number])) return;
  await prisma.local.update({
    where: { id: localId },
    data: { tema: tema as (typeof TEMAS)[number] },
  });
  updateTag(tagLocal(localId));
  revalidatePath(`/tpv/${localId}`, "layout");
}

export async function actualizarColorMarca(localId: string, colorMarca: string) {
  await requireLocalAccess(localId);
  if (!COLORES_MARCA.includes(colorMarca as (typeof COLORES_MARCA)[number])) return;
  await prisma.local.update({
    where: { id: localId },
    data: { colorMarca: colorMarca as (typeof COLORES_MARCA)[number] },
  });
  updateTag(tagLocal(localId));
  revalidatePath(`/tpv/${localId}`, "layout");
}

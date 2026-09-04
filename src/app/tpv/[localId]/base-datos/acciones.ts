"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { buscarTabla } from "./tablas";
import type { CampoTabla, FilaTabla, ResultadoMutacion } from "./tipos";

function validarRequeridos(campos: CampoTabla[], datos: FilaTabla): string | null {
  for (const campo of campos) {
    if (campo.soloLectura || !campo.requerido) continue;
    const v = datos[campo.clave];
    if (v === undefined || v === null || v === "") {
      return `El campo "${campo.etiqueta}" es obligatorio.`;
    }
  }
  return null;
}

function revalidar(localId: string, slug: string) {
  revalidatePath(`/tpv/${localId}/base-datos/${slug}`);
  revalidatePath(`/tpv/${localId}/base-datos`);
}

export async function crearFilaAction(
  localId: string,
  slug: string,
  datos: FilaTabla,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.crear) return { error: "Esta tabla no admite añadir filas nuevas." };

  const errorValidacion = validarRequeridos(tabla.campos, datos);
  if (errorValidacion) return { error: errorValidacion };

  const resultado = await tabla.crear(localId, datos);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

export async function actualizarFilaAction(
  localId: string,
  slug: string,
  id: string,
  datos: FilaTabla,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.actualizar) return { error: "Esta tabla no admite editar filas." };

  const resultado = await tabla.actualizar(localId, id, datos);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

export async function borrarFilaAction(
  localId: string,
  slug: string,
  id: string,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.borrar) return { error: "Esta tabla no admite borrar filas." };

  const resultado = await tabla.borrar(localId, id);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

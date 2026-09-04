import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ColorMarca, TemaColor } from "@/lib/apariencia";
import type { FormatoPlano } from "@/generated/prisma/enums";

// Consultas que se repiten en casi cada toque de pantalla (tomar nota,
// cambiar de sección) pero cuyos datos casi nunca cambian — la carta y el
// tema del local. Cachearlas evita ir a la base de datos por ellas en cada
// línea que se añade a una comanda o cada vez que se navega dentro de un
// local; solo se recalculan cuando algo las invalida de verdad (ver
// tagProductos/tagLocal, usados desde las acciones que sí las tocan).

export function tagProductos(localId: string) {
  return `productos:${localId}`;
}

export function tagLocal(localId: string) {
  return `local:${localId}`;
}

export type ProductoCarta = {
  id: string;
  nombre: string;
  precioVenta: number;
  categoriaId: string;
  categoriaNombre: string;
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
};

export async function obtenerProductosCarta(localId: string): Promise<ProductoCarta[]> {
  return unstable_cache(
    async () => {
      const filas = await prisma.producto.findMany({
        where: { localId },
        // Por categoría (en su orden de carta) y dentro de cada una por
        // nombre — así el selector de la comanda agrupa por pestaña de
        // categoría sin tener que reordenar nada en el cliente.
        orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
        select: {
          id: true,
          nombre: true,
          precioVenta: true,
          categoriaId: true,
          categoria: { select: { nombre: true } },
          tipo: true,
        },
      });
      return filas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precioVenta: Number(p.precioVenta),
        categoriaId: p.categoriaId,
        categoriaNombre: p.categoria.nombre,
        tipo: p.tipo,
      }));
    },
    ["productos-carta", localId],
    { tags: [tagProductos(localId)] },
  )();
}

export type LocalApariencia = {
  tema: TemaColor;
  colorMarca: ColorMarca;
  planoFormato: FormatoPlano;
};

export async function obtenerAparienciaLocal(localId: string): Promise<LocalApariencia | null> {
  return unstable_cache(
    async () => {
      const local = await prisma.local.findUnique({
        where: { id: localId },
        select: { tema: true, colorMarca: true, planoFormato: true },
      });
      return local ?? null;
    },
    ["local-apariencia", localId],
    { tags: [tagLocal(localId)] },
  )();
}

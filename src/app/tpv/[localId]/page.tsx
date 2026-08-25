import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PlanoEditable, type ZonaPlano, type ElementoPlanoData } from "./plano-editable";

export default async function TpvPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const { membresia } = await requireLocalAccess(localId);

  const [zonasRaw, elementosRaw] = await Promise.all([
    prisma.zona.findMany({
      where: { localId },
      orderBy: { orden: "asc" },
      include: {
        mesas: {
          orderBy: { numero: "asc" },
          include: {
            comandas: {
              where: { estado: { in: ["ABIERTA", "ENVIADA"] } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.elementoPlano.findMany({ where: { localId }, orderBy: { id: "asc" } }),
  ]);

  const elementos: ElementoPlanoData[] = elementosRaw.map((el) => ({
    id: el.id,
    tipo: el.tipo,
    posicionX: el.posicionX,
    posicionY: el.posicionY,
    ancho: el.ancho,
    alto: el.alto,
    rotacion: el.rotacion,
  }));

  const zonas: ZonaPlano[] = zonasRaw.map((zona) => ({
    id: zona.id,
    nombre: zona.nombre,
    puntos: zona.puntos as unknown as ZonaPlano["puntos"],
    color: zona.color,
    mesas: zona.mesas.map((mesa) => ({
      id: mesa.id,
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      posicionX: mesa.posicionX,
      posicionY: mesa.posicionY,
      forma: mesa.forma,
      ancho: mesa.ancho,
      alto: mesa.alto,
      ocupada: mesa.comandas.length > 0,
    })),
  }));

  const hayMesas = zonas.some((z) => z.mesas.length > 0);

  return (
    <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {membresia.localNombre}
          </h1>
          <p className="text-text-muted">Plano de sala</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/productos`}>
            <Button variant="secondary">Productos</Button>
          </Link>
          <Link href={`/tpv/${localId}/mesas`}>
            <Button variant="secondary">Gestionar mesas</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Volver</Button>
          </Link>
        </div>
      </div>

      {zonas.length === 0 ? (
        <p className="text-text-muted">
          Todavía no hay zonas.{" "}
          <Link href={`/tpv/${localId}/mesas`} className="text-brand underline">
            Crea la primera
          </Link>
          .
        </p>
      ) : !hayMesas ? (
        <p className="text-text-muted">
          Todavía no hay mesas.{" "}
          <Link href={`/tpv/${localId}/mesas`} className="text-brand underline">
            Añade la primera
          </Link>
          .
        </p>
      ) : null}

      {zonas.length > 0 && (
        <PlanoEditable localId={localId} zonas={zonas} elementos={elementos} />
      )}
    </main>
  );
}

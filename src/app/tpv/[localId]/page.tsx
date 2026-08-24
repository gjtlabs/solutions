import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PlanoEditable, type MesaPlano } from "./plano-editable";

export default async function TpvPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const { membresia } = await requireLocalAccess(localId);

  const mesas = await prisma.mesa.findMany({
    where: { localId },
    include: {
      comandas: {
        where: { estado: { in: ["ABIERTA", "ENVIADA"] } },
        take: 1,
      },
    },
    orderBy: [{ zona: "asc" }, { numero: "asc" }],
  });

  const zonasMap = new Map<string, MesaPlano[]>();
  for (const mesa of mesas) {
    const grupo = zonasMap.get(mesa.zona) ?? [];
    grupo.push({
      id: mesa.id,
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      posicionX: mesa.posicionX,
      posicionY: mesa.posicionY,
      forma: mesa.forma,
      ancho: mesa.ancho,
      alto: mesa.alto,
      ocupada: mesa.comandas.length > 0,
    });
    zonasMap.set(mesa.zona, grupo);
  }
  const zonas = Array.from(zonasMap.entries()).map(([zona, mesasZona]) => ({
    zona,
    mesas: mesasZona,
  }));

  return (
    <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
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

      {mesas.length === 0 ? (
        <p className="text-text-muted">
          Todavía no hay mesas.{" "}
          <Link href={`/tpv/${localId}/mesas`} className="text-brand underline">
            Añade la primera
          </Link>
          .
        </p>
      ) : (
        <PlanoEditable localId={localId} zonas={zonas} />
      )}
    </main>
  );
}

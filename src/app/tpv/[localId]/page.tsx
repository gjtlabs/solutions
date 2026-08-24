import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const zonas = new Map<string, typeof mesas>();
  for (const mesa of mesas) {
    const grupo = zonas.get(mesa.zona) ?? [];
    grupo.push(mesa);
    zonas.set(mesa.zona, grupo);
  }

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
        Array.from(zonas.entries()).map(([zona, mesasZona]) => (
          <section key={zona} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-text-muted">{zona}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {mesasZona.map((mesa) => {
                const ocupada = mesa.comandas.length > 0;
                return (
                  <Link
                    key={mesa.id}
                    href={`/tpv/${localId}/mesa/${mesa.id}`}
                    className="bg-surface border border-border rounded-md p-4 h-24 flex flex-col justify-between hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span className="text-xl font-semibold text-text">
                      {mesa.numero}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-faint">
                        {mesa.capacidad} pers.
                      </span>
                      <Badge semantic={ocupada ? "info" : "neutral"}>
                        {ocupada ? "Ocupada" : "Libre"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

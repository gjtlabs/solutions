import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";
import { LineaForm } from "./linea-form";
import { CobroForm } from "./cobro-form";
import { abrirMesa, enviarACocina, marcarServido } from "./actions";

const ESTADO_LINEA_BADGE: Record<string, { label: string; semantic: BadgeSemantic }> = {
  PENDIENTE: { label: "Pendiente", semantic: "warning" },
  COCINA: { label: "En cocina", semantic: "info" },
  SERVIDO: { label: "Servido", semantic: "success" },
};

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ localId: string; mesaId: string }>;
}) {
  const { localId, mesaId } = await params;
  await requireLocalAccess(localId);

  // Las tres consultas son independientes entre sí — lanzarlas en paralelo
  // en vez de una tras otra es lo que más nota el camarero al tomar nota:
  // la pantalla tarda lo que tarde la más lenta de las tres, no la suma.
  const [mesa, comanda, productosRaw] = await Promise.all([
    prisma.mesa.findUnique({
      where: { id: mesaId },
      select: { id: true, localId: true, numero: true, zona: { select: { nombre: true } } },
    }),
    prisma.comanda.findFirst({
      where: { mesaId, estado: { in: ["ABIERTA", "ENVIADA"] } },
      include: {
        lineas: { include: { producto: true }, orderBy: { id: "asc" } },
      },
    }),
    prisma.producto.findMany({
      where: { localId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, precioVenta: true },
    }),
  ]);

  if (!mesa || mesa.localId !== localId) {
    notFound();
  }

  const productos = productosRaw.map((p) => ({
    ...p,
    precioVenta: Number(p.precioVenta),
  }));

  const total =
    comanda?.lineas.reduce(
      (acc, l) => acc + Number(l.producto.precioVenta) * l.cantidad,
      0,
    ) ?? 0;

  const hayPendientes = comanda?.lineas.some((l) => l.estado === "PENDIENTE") ?? false;

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Mesa {mesa.numero}
          </h1>
          <p className="text-text-muted">{mesa.zona.nombre}</p>
        </div>
        <Link href={`/tpv/${localId}`}>
          <Button variant="ghost">Volver al plano</Button>
        </Link>
      </div>

      {!comanda ? (
        <form action={abrirMesa.bind(null, localId, mesaId)}>
          <Button type="submit" size="tactil">
            Abrir mesa
          </Button>
        </form>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {comanda.lineas.length === 0 ? (
              <p className="text-text-muted">Todavía no hay ninguna línea.</p>
            ) : (
              comanda.lineas.map((linea) => {
                const estado = ESTADO_LINEA_BADGE[linea.estado];
                return (
                  <div
                    key={linea.id}
                    className="bg-surface border border-border rounded-md px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-text">
                        <span className="font-mono">{linea.cantidad}×</span>{" "}
                        {linea.producto.nombre}
                      </p>
                      {linea.notas && (
                        <p className="text-sm text-text-muted">{linea.notas}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge semantic={estado.semantic}>{estado.label}</Badge>
                      {linea.estado === "COCINA" && (
                        <form action={marcarServido.bind(null, localId, mesaId, linea.id)}>
                          <Button type="submit" variant="ghost">
                            Servido
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <LineaForm
            localId={localId}
            mesaId={mesaId}
            comandaId={comanda.id}
            productos={productos}
          />

          {hayPendientes && (
            <form action={enviarACocina.bind(null, localId, mesaId, comanda.id)}>
              <Button type="submit" variant="secondary" size="tactil">
                Enviar a cocina
              </Button>
            </form>
          )}

          <div className="border-t border-border pt-4 flex flex-col gap-3">
            <p className="text-lg text-text">
              Total: <span className="font-mono font-semibold">{total.toFixed(2)} €</span>
            </p>
            <CobroForm localId={localId} mesaId={mesaId} comandaId={comanda.id} total={total} />
          </div>
        </>
      )}
    </main>
  );
}

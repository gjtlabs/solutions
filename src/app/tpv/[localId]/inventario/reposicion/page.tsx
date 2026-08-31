import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReposicionPanel, type LineaReposicionData } from "./reposicion-panel";
import { generarAhora } from "./actions";

function formatearFechaHora(fecha: Date) {
  return fecha.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function ReposicionPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;

  const reposicion = await prisma.reposicion.findFirst({
    where: { localId, estado: "PENDIENTE" },
    orderBy: { fecha: "desc" },
    include: { lineas: { include: { ingrediente: true }, orderBy: { id: "asc" } } },
  });

  const ultimaCompletada = reposicion
    ? null
    : await prisma.reposicion.findFirst({
        where: { localId, estado: "COMPLETADA" },
        orderBy: { fecha: "desc" },
      });

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl font-semibold text-text">Reposición</h2>
        <form action={generarAhora.bind(null, localId)}>
          <Button type="submit" variant="secondary">
            Generar ahora
          </Button>
        </form>
      </div>

      {!reposicion ? (
        <p className="text-text-muted">
          No hay ninguna reposición pendiente. Se genera sola al cerrar la última
          mesa del día si alguna referencia está por debajo de su mínimo en
          barra
          {ultimaCompletada && (
            <> — la última se completó el {formatearFechaHora(ultimaCompletada.fecha)}</>
          )}
          .
        </p>
      ) : (
        <>
          <p className="text-text-muted mb-4">
            Generada el {formatearFechaHora(reposicion.fecha)}. Lleva cada
            referencia de almacén a barra y márcala como &quot;Llevado&quot;.
          </p>
          <ReposicionPanel
            localId={localId}
            lineas={reposicion.lineas.map(
              (linea): LineaReposicionData => ({
                id: linea.id,
                ingredienteNombre: linea.ingrediente.nombre,
                unidadMedida: linea.ingrediente.unidadMedida,
                cantidadSugerida: Number(linea.cantidadSugerida),
                completada: linea.completada,
              }),
            )}
          />
        </>
      )}
    </Card>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LineaForm } from "./linea-form";
import { CobroForm } from "./cobro-form";
import { LineaRow } from "./linea-row";
import { abrirMesa, enviarACocina } from "./actions";

// El cuerpo de la comanda de una mesa — aparte de la página a pantalla
// completa (/mesa/[mesaId], para acceder por URL directa o recargar) para
// que la misma consulta y el mismo JSX sirvan también dentro del modal que
// se abre al tocar una mesa en el plano, sin duplicar nada entre los dos.
export async function ComandaContenido({
  localId,
  mesaId,
}: {
  localId: string;
  mesaId: string;
}) {
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-text">Mesa {mesa.numero}</h2>
        <p className="text-text-muted">{mesa.zona.nombre}</p>
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
              comanda.lineas.map((linea) => (
                <LineaRow
                  key={linea.id}
                  localId={localId}
                  mesaId={mesaId}
                  linea={{
                    id: linea.id,
                    nombre: linea.producto.nombre,
                    cantidad: linea.cantidad,
                    notas: linea.notas,
                    estado: linea.estado,
                  }}
                />
              ))
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
    </div>
  );
}

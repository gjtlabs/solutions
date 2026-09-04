import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { Button } from "@/components/ui/button";
import { VolverAtrasButton } from "@/components/volver-atras-button";
import { ComandaContenido } from "./comanda-contenido";

// Página a pantalla completa — para llegar por URL directa (compartir el
// enlace de una mesa, recargar) o cuando el plano intercepta esta misma
// ruta y la muestra en una ventana flotante en su lugar (ver
// ../../@mesaModal). El cuerpo es el mismo componente en los dos casos.
export default async function ComandaPage({
  params,
}: {
  params: Promise<{ localId: string; mesaId: string }>;
}) {
  const { localId, mesaId } = await params;
  await requireLocalAccess(localId);

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <VolverAtrasButton />
        <Link href={`/tpv/${localId}`}>
          <Button variant="ghost">Inicio</Button>
        </Link>
      </div>

      <ComandaContenido localId={localId} mesaId={mesaId} />
    </main>
  );
}

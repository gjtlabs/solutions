import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AjustesPanel } from "./ajustes-panel";

export default async function AjustesPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const { membresia } = await requireLocalAccess(localId);

  const local = await prisma.local.findUnique({
    where: { id: localId },
    select: { planoFormato: true, tema: true, colorMarca: true },
  });

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Ajustes</h1>
          <p className="text-text-muted">{membresia.localNombre}</p>
        </div>
        <Link href={`/tpv/${localId}`}>
          <Button variant="ghost">Volver al plano</Button>
        </Link>
      </div>

      <AjustesPanel
        localId={localId}
        planoFormato={local?.planoFormato ?? "PANORAMICO_16_9"}
        tema={local?.tema ?? "CLARO"}
        colorMarca={local?.colorMarca ?? "VERDE"}
      />
    </main>
  );
}

import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { Button } from "@/components/ui/button";
import { InventarioTabs } from "./inventario-tabs";

export default async function InventarioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  return (
    <main className="flex-1 p-8 max-w-[90rem] mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">Inventario</h1>
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/proveedores`}>
            <Button variant="secondary">Proveedores</Button>
          </Link>
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Volver al plano</Button>
          </Link>
        </div>
      </div>

      <InventarioTabs localId={localId} />

      {children}
    </main>
  );
}

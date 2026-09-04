import { requireLocalAccess } from "@/lib/local-access";
import { Modal } from "@/components/ui/modal";
import { ComandaContenido } from "@/app/tpv/[localId]/mesa/[mesaId]/comanda-contenido";

// Intercepta la navegación (por ejemplo, al tocar una mesa en el plano) a
// /tpv/[localId]/mesa/[mesaId] y la muestra flotando sobre la página en la
// que ya se estaba, en vez de sustituirla — así no hace falta "volver
// atrás" para recuperar el plano, basta con cerrar la ventana. Entrar por
// URL directa o recargar sigue llevando a la página a pantalla completa
// (../../mesa/[mesaId]/page.tsx), que no cambia.
export default async function ComandaModalPage({
  params,
}: {
  params: Promise<{ localId: string; mesaId: string }>;
}) {
  const { localId, mesaId } = await params;
  await requireLocalAccess(localId);

  return (
    <Modal>
      <ComandaContenido localId={localId} mesaId={mesaId} />
    </Modal>
  );
}

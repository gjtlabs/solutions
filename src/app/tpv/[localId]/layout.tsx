import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { estiloColorMarca, type ColorMarca, type TemaColor } from "@/lib/apariencia";

// Aplica una única vez, para todas las páginas de este local (plano,
// productos, mesas, caja, ventas, ajustes...), el tema claro/oscuro y el
// color de marca elegidos en Ajustes — así ningún componente tiene que
// leerlos ni pasarlos por su cuenta.
export default async function LocalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const local = await prisma.local.findUnique({
    where: { id: localId },
    select: { tema: true, colorMarca: true },
  });
  const tema: TemaColor = local?.tema ?? "CLARO";
  const colorMarca: ColorMarca = local?.colorMarca ?? "VERDE";

  return (
    // min-h-screen (100vh) en vez de min-h-full (100%): el div del layout es
    // hijo de <body>, que solo tiene min-height, no height — un porcentaje
    // no tiene contra qué resolverse ahí, así que en una página con poco
    // contenido el fondo oscuro no llegaba a cubrir el resto del viewport.
    <div
      className={`min-h-screen flex flex-col bg-bg text-text ${tema === "OSCURO" ? "tema-oscuro" : ""}`}
      style={estiloColorMarca(colorMarca, tema)}
    >
      {children}
    </div>
  );
}

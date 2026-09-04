import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { Card } from "@/components/ui/card";

const MODULOS = [
  {
    href: "plano",
    nombre: "Plano de sala",
    descripcion: "Mesas, comandas y cobro en curso.",
  },
  {
    href: "mesas",
    nombre: "Gestionar mesas",
    descripcion: "Zonas, mesas y su disposición en el plano.",
  },
  {
    href: "productos",
    nombre: "Productos",
    descripcion: "Carta y escandallo de cada producto.",
  },
  {
    href: "inventario",
    nombre: "Inventario",
    descripcion: "Stock, pedidos a proveedores y reposición.",
  },
  {
    href: "proveedores",
    nombre: "Proveedores",
    descripcion: "Alta y datos de contacto.",
  },
  {
    href: "caja",
    nombre: "Caja",
    descripcion: "Cierre y arqueo del turno.",
  },
  {
    href: "ventas",
    nombre: "Ventas",
    descripcion: "Histórico de tickets e informes.",
  },
  {
    href: "ajustes",
    nombre: "Ajustes",
    descripcion: "Tema, color de marca y formato de página.",
  },
  {
    href: "base-datos",
    nombre: "Base de datos",
    descripcion: "Todas las tablas del sistema, en un único sitio.",
  },
] as const;

export default async function LocalHomePage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const { membresia } = await requireLocalAccess(localId);

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{membresia.localNombre}</h1>
          <p className="text-text-muted">Elige a dónde quieres ir.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-text-muted underline">
          Tus locales
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map((modulo) => (
          <Link key={modulo.href} href={`/tpv/${localId}/${modulo.href}`}>
            <Card className="h-full transition-shadow hover:shadow-raised cursor-pointer">
              <h2 className="text-lg font-semibold text-text mb-1">{modulo.nombre}</h2>
              <p className="text-sm text-text-muted">{modulo.descripcion}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

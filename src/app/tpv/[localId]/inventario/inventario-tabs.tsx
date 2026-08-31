"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function InventarioTabs({ localId }: { localId: string }) {
  const pathname = usePathname();
  const base = `/tpv/${localId}/inventario`;
  const tabs = [
    { href: base, label: "Stock" },
    { href: `${base}/pedidos`, label: "Pedidos" },
    { href: `${base}/reposicion`, label: "Reposición" },
  ];

  return (
    <div className="flex gap-4 border-b border-border">
      {tabs.map((tab) => {
        // El tab de Stock (la raíz del módulo) solo se marca activo en la
        // ruta exacta — si no, seguiría "encendido" dentro de Pedidos o
        // Reposición porque ambas empiezan también por /inventario.
        const activo = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              activo
                ? "text-text border-b-2 border-brand font-medium px-1 pb-2"
                : "text-text-muted border-b-2 border-transparent hover:text-text px-1 pb-2"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

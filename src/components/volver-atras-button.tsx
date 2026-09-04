"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Un solo botón "Volver atrás" para todas las cabeceras de sección — usa el
// historial del navegador en vez de enlazar a una sección "padre" fija, así
// funciona igual venga el usuario de donde venga (no todas las pantallas
// tienen un único padre natural: Caja y Ventas se enlazaban entre sí,
// Proveedores e Inventario también).
export function VolverAtrasButton() {
  const router = useRouter();
  return (
    <Button type="button" variant="ghost" onClick={() => router.back()}>
      Volver atrás
    </Button>
  );
}

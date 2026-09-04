"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { addLinea, type LineaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Producto = {
  id: string;
  nombre: string;
  precioVenta: number;
  categoriaId: string;
  categoriaNombre: string;
};

export function LineaForm({
  localId,
  mesaId,
  comandaId,
  productos,
}: {
  localId: string;
  mesaId: string;
  comandaId: string;
  productos: Producto[];
}) {
  const action = addLinea.bind(null, localId, mesaId, comandaId);
  const [state, formAction, pending] = useActionState<LineaFormState, FormData>(
    action,
    undefined,
  );

  // Las categorías salen ya en su orden de carta porque productos llega
  // ordenado por categoría — aquí solo hace falta quedarse con la primera
  // aparición de cada una, sin reordenar nada.
  const categorias = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const p of productos) {
      if (!vistas.has(p.categoriaId)) vistas.set(p.categoriaId, p.categoriaNombre);
    }
    return [...vistas.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]?.id ?? "");
  const [productoId, setProductoId] = useState("");

  const productosDeCategoria = productos.filter((p) => p.categoriaId === categoriaActiva);
  const productoElegido = productos.find((p) => p.id === productoId);

  if (productos.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Todavía no hay productos en la carta —{" "}
        <a href={`/tpv/${localId}/productos`} className="text-brand underline">
          añade alguno
        </a>{" "}
        para poder tomar comanda.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productoId" value={productoId} />

      <div className="flex flex-wrap gap-2">
        {categorias.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={categoriaActiva === c.id ? "primary" : "ghost"}
            size="tactil"
            onClick={() => setCategoriaActiva(c.id)}
          >
            {c.nombre}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {productosDeCategoria.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProductoId(p.id)}
            className={`flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-md border p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              productoId === p.id
                ? "border-brand bg-brand-subtle"
                : "border-border bg-surface-2 hover:bg-border/40"
            }`}
          >
            <span className="text-sm font-medium text-text leading-tight line-clamp-2">
              {p.nombre}
            </span>
            <span className="font-mono text-sm text-text-muted">{p.precioVenta.toFixed(2)} €</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <p className="text-sm text-text-muted min-w-[8rem]">
          {productoElegido ? (
            <>
              Elegido: <span className="font-medium text-text">{productoElegido.nombre}</span>
            </>
          ) : (
            "Toca un producto arriba."
          )}
        </p>
        <Input
          label="Cantidad"
          name="cantidad"
          type="number"
          min={1}
          defaultValue={1}
          required
          tactil
          className="w-24"
        />
        <Input label="Notas" name="notas" placeholder="sin hielo…" tactil />
        <Button type="submit" size="tactil" disabled={pending || !productoId}>
          {pending ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

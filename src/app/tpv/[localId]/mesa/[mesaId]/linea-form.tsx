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
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
};

export function LineaForm({
  localId,
  mesaId,
  productos,
}: {
  localId: string;
  mesaId: string;
  productos: Producto[];
}) {
  const action = addLinea.bind(null, localId, mesaId);
  const [state, formAction, pending] = useActionState<LineaFormState, FormData>(
    action,
    undefined,
  );

  // Las categorías salen ya en su orden de carta porque productos llega
  // ordenado por categoría — aquí solo hace falta quedarse con la primera
  // aparición de cada una (y su tipo, para agruparlas), sin reordenar nada
  // dentro de cada grupo. Bebida siempre antes que comida.
  const { bebidas, comidas } = useMemo(() => {
    const vistas = new Map<string, { id: string; nombre: string; tipo: Producto["tipo"] }>();
    for (const p of productos) {
      if (!vistas.has(p.categoriaId)) {
        vistas.set(p.categoriaId, { id: p.categoriaId, nombre: p.categoriaNombre, tipo: p.tipo });
      }
    }
    const todas = [...vistas.values()];
    return {
      bebidas: todas.filter((c) => c.tipo === "BEBIDA"),
      comidas: todas.filter((c) => c.tipo !== "BEBIDA"),
    };
  }, [productos]);
  const categorias = useMemo(() => [...bebidas, ...comidas], [bebidas, comidas]);

  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]?.id ?? "");
  const [productoId, setProductoId] = useState("");

  const productosDeCategoria = productos.filter((p) => p.categoriaId === categoriaActiva);
  const productoElegido = productos.find((p) => p.id === productoId);

  function elegirCategoria(id: string) {
    setCategoriaActiva(id);
    setProductoId("");
  }

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
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="productoId" value={productoId} />

      <div className="flex flex-col gap-4">
        {bebidas.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              Bebidas
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
              {bebidas.map((c) => (
                <ChipCategoria
                  key={c.id}
                  nombre={c.nombre}
                  activa={categoriaActiva === c.id}
                  onClick={() => elegirCategoria(c.id)}
                />
              ))}
            </div>
          </div>
        )}
        {comidas.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              Comida
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
              {comidas.map((c) => (
                <ChipCategoria
                  key={c.id}
                  nombre={c.nombre}
                  activa={categoriaActiva === c.id}
                  onClick={() => elegirCategoria(c.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className="border-t border-border" />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
        {productosDeCategoria.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProductoId(p.id)}
            className={`flex h-28 flex-col items-center justify-center gap-1.5 rounded-md border-2 p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              productoId === p.id
                ? "border-brand bg-brand-subtle"
                : "border-border-strong bg-surface-2/60 hover:bg-surface-2"
            }`}
          >
            <span className="text-base font-medium text-text leading-tight line-clamp-2">
              {p.nombre}
            </span>
            <span className="font-mono text-base text-text-muted">{p.precioVenta.toFixed(2)} €</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          {productoElegido ? (
            <>
              Elegido: <span className="font-medium text-text">{productoElegido.nombre}</span>
            </>
          ) : (
            "Toca un producto arriba."
          )}
        </p>
        <div className="flex flex-wrap items-end gap-3">
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
          <Input label="Notas" name="notas" placeholder="sin hielo…" tactil className="flex-1 min-w-[10rem]" />
          <Button type="submit" size="tactil" disabled={pending || !productoId}>
            {pending ? "Añadiendo…" : "Añadir"}
          </Button>
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

function ChipCategoria({
  nombre,
  activa,
  onClick,
}: {
  nombre: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-20 items-center justify-center rounded-md border-2 px-4 text-center text-lg font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        activa
          ? "border-brand bg-brand text-brand-on"
          : "border-border-strong bg-surface-2 text-text hover:bg-border/40"
      }`}
    >
      <span className="line-clamp-2">{nombre}</span>
    </button>
  );
}

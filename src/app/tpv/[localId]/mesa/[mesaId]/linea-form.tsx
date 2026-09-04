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
  // Cada toque sobre el mismo producto suma uno a la cantidad — así, para
  // pedir tres cañas, son tres toques seguidos sobre "Caña", sin tener que
  // ir hasta el campo de cantidad. Tocar otro producto empieza de nuevo en 1.
  const [cantidad, setCantidad] = useState(1);

  const productosDeCategoria = productos.filter((p) => p.categoriaId === categoriaActiva);
  const productoElegido = productos.find((p) => p.id === productoId);

  function elegirCategoria(id: string) {
    setCategoriaActiva(id);
    setProductoId("");
    setCantidad(1);
  }

  function tocarProducto(id: string) {
    if (productoId === id) {
      setCantidad((c) => c + 1);
    } else {
      setProductoId(id);
      setCantidad(1);
    }
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
    <form
      action={formAction}
      onSubmit={() => {
        // Optimista: no hace falta esperar la respuesta del servidor para
        // dejar el selector listo para el siguiente producto — así no se
        // pierde ni un toque entre una línea y la siguiente.
        setProductoId("");
        setCantidad(1);
      }}
      className="flex flex-col gap-6"
    >
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
            onClick={() => tocarProducto(p.id)}
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
              Elegido: <span className="font-medium text-text">{productoElegido.nombre}</span> — toca
              otra vez para sumar cantidad.
            </>
          ) : (
            "Toca un producto arriba. Tócalo varias veces seguidas para sumar cantidad."
          )}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Cantidad</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                aria-label="Restar uno a la cantidad"
                className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-border-strong bg-surface-2 text-2xl font-bold text-text active:bg-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                −
              </button>
              <input
                type="number"
                name="cantidad"
                min={1}
                required
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Math.round(Number(e.target.value)) || 1))}
                className="h-14 w-16 rounded-sm border border-border bg-surface text-center text-lg text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <button
                type="button"
                onClick={() => setCantidad((c) => c + 1)}
                aria-label="Sumar uno a la cantidad"
                className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-border-strong bg-surface-2 text-2xl font-bold text-text active:bg-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                +
              </button>
            </div>
          </div>
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

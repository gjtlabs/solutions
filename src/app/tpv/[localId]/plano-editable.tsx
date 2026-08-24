"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { moverMesa, actualizarEstiloMesa } from "./mesas/actions";

export type MesaPlano = {
  id: string;
  numero: string;
  capacidad: number;
  posicionX: number;
  posicionY: number;
  forma: "REDONDA" | "RECTANGULAR";
  ancho: number;
  alto: number;
  ocupada: boolean;
};

type Estilo = { forma: "REDONDA" | "RECTANGULAR"; ancho: number; alto: number };

// Umbral en px por debajo del cual un pointerdown+pointerup cuenta como
// "toque", no como arrastre — si no lo hubiera, cualquier click movería o
// redimensionaría un pixel antes de contar como click.
const UMBRAL_ARRASTRE = 6;
const TAMANO_MIN = 50;
const TAMANO_MAX = 200;

export function PlanoEditable({
  localId,
  zonas,
}: {
  localId: string;
  zonas: { zona: string; mesas: MesaPlano[] }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const todasLasMesas = zonas.flatMap((z) => z.mesas);
  const [posiciones, setPosiciones] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(todasLasMesas.map((m) => [m.id, { x: m.posicionX, y: m.posicionY }])),
  );
  const [estilos, setEstilos] = useState<Record<string, Estilo>>(() =>
    Object.fromEntries(
      todasLasMesas.map((m) => [m.id, { forma: m.forma, ancho: m.ancho, alto: m.alto }]),
    ),
  );

  const arrastre = useRef<{
    id: string;
    containerEl: HTMLDivElement;
    startX: number;
    startY: number;
    distancia: number;
  } | null>(null);

  const redimension = useRef<{
    id: string;
    startX: number;
    startY: number;
    anchoInicial: number;
    altoInicial: number;
  } | null>(null);

  function guardarEstilo(mesaId: string, next: Estilo) {
    setEstilos((prev) => ({ ...prev, [mesaId]: next }));
    startTransition(() => {
      actualizarEstiloMesa(localId, mesaId, next.forma, next.ancho, next.alto);
    });
  }

  // --- Arrastrar para reposicionar ---

  function onPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    mesaId: string,
    containerEl: HTMLDivElement | null,
  ) {
    if (!containerEl) return;
    // Se registra siempre, editando o no: en modo vista no se arrastra,
    // pero igualmente hace falta saber dónde empezó el toque para
    // distinguirlo de un arrastre accidental al soltar.
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { id: mesaId, containerEl, startX: e.clientX, startY: e.clientY, distancia: 0 };
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = arrastre.current;
    if (!drag) return;
    drag.distancia = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);

    if (!editando) return; // en modo vista no se reposiciona, solo se detecta el toque

    const rect = drag.containerEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosiciones((prev) => ({
      ...prev,
      [drag.id]: { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) },
    }));
  }

  function onPointerUp(mesaId: string) {
    const drag = arrastre.current;
    arrastre.current = null;

    if (!drag || drag.id !== mesaId) return;

    if (!editando) {
      router.push(`/tpv/${localId}/mesa/${mesaId}`);
      return;
    }

    if (drag.distancia < UMBRAL_ARRASTRE) {
      // No se movió: es un toque, no un arrastre.
      setSeleccion(mesaId);
      return;
    }

    const pos = posiciones[mesaId];
    if (pos) {
      startTransition(() => {
        moverMesa(localId, mesaId, pos.x, pos.y);
      });
    }
  }

  // --- Arrastrar el asa de la esquina para redimensionar ---

  function onResizePointerDown(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const actual = estilos[mesaId];
    redimension.current = {
      id: mesaId,
      startX: e.clientX,
      startY: e.clientY,
      anchoInicial: actual.ancho,
      altoInicial: actual.alto,
    };
  }

  function onResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const r = redimension.current;
    if (!r) return;
    const ancho = Math.min(
      TAMANO_MAX,
      Math.max(TAMANO_MIN, r.anchoInicial + (e.clientX - r.startX)),
    );
    const alto = Math.min(
      TAMANO_MAX,
      Math.max(TAMANO_MIN, r.altoInicial + (e.clientY - r.startY)),
    );
    setEstilos((prev) => ({ ...prev, [r.id]: { ...prev[r.id], ancho, alto } }));
  }

  function onResizePointerUp(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    const r = redimension.current;
    redimension.current = null;
    if (!r || r.id !== mesaId) return;
    startTransition(() => {
      const estilo = estilos[mesaId];
      actualizarEstiloMesa(localId, mesaId, estilo.forma, estilo.ancho, estilo.alto);
    });
  }

  const mesaSeleccionada = todasLasMesas.find((m) => m.id === seleccion);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {editando
            ? "Arrastra las mesas para colocarlas. Toca una para cambiar su forma y tamaño (o arrastra su esquina)."
            : "Toca una mesa para abrir su comanda."}
        </p>
        <Button
          type="button"
          variant={editando ? "primary" : "secondary"}
          onClick={() => {
            setEditando((v) => !v);
            setSeleccion(null);
          }}
        >
          {editando ? "Listo" : "Editar plano"}
        </Button>
      </div>

      {zonas.map(({ zona, mesas }) => (
        <ZonaCanvas
          key={zona}
          zona={zona}
          mesas={mesas}
          editando={editando}
          posiciones={posiciones}
          estilos={estilos}
          seleccion={seleccion}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onResizePointerDown={onResizePointerDown}
          onResizePointerMove={onResizePointerMove}
          onResizePointerUp={onResizePointerUp}
        />
      ))}

      {editando && mesaSeleccionada && (
        <EstiloMesaPanel
          key={mesaSeleccionada.id}
          mesa={mesaSeleccionada}
          estilo={estilos[mesaSeleccionada.id]}
          onCambiar={(next) => guardarEstilo(mesaSeleccionada.id, next)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
    </div>
  );
}

function ZonaCanvas({
  zona,
  mesas,
  editando,
  posiciones,
  estilos,
  seleccion,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: {
  zona: string;
  mesas: MesaPlano[];
  editando: boolean;
  posiciones: Record<string, { x: number; y: number }>;
  estilos: Record<string, Estilo>;
  seleccion: string | null;
  onPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    mesaId: string,
    containerEl: HTMLDivElement | null,
  ) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (mesaId: string) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLSpanElement>, mesaId: string) => void;
  onResizePointerMove: (e: React.PointerEvent<HTMLSpanElement>) => void;
  onResizePointerUp: (e: React.PointerEvent<HTMLSpanElement>, mesaId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-text-muted">{zona}</h2>
      <div
        ref={containerRef}
        className={`relative h-[26rem] w-full rounded-md border bg-surface ${
          editando ? "border-dashed border-border-strong" : "border-border"
        }`}
      >
        {mesas.map((mesa) => {
          const pos = posiciones[mesa.id] ?? { x: mesa.posicionX, y: mesa.posicionY };
          const estilo = estilos[mesa.id] ?? { forma: mesa.forma, ancho: mesa.ancho, alto: mesa.alto };
          const seleccionada = seleccion === mesa.id;
          return (
            <button
              key={mesa.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, mesa.id, containerRef.current)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(mesa.id)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: estilo.ancho,
                height: estilo.alto,
                borderRadius: estilo.forma === "REDONDA" ? "9999px" : "var(--radius-md)",
                transform: "translate(-50%, -50%)",
                touchAction: editando ? "none" : undefined,
              }}
              className={`absolute flex flex-col items-center justify-center gap-1 border bg-surface-2 hover:bg-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                seleccionada ? "border-brand border-2" : "border-border-strong"
              }`}
            >
              <span className="text-lg font-semibold text-text leading-none">
                {mesa.numero}
              </span>
              <span className="text-xs text-text-faint leading-none">
                {mesa.capacidad}p
              </span>
              {!editando && (
                <Badge semantic={mesa.ocupada ? "info" : "neutral"} className="mt-0.5">
                  {mesa.ocupada ? "Ocupada" : "Libre"}
                </Badge>
              )}
              {editando && seleccionada && (
                <span
                  role="presentation"
                  onPointerDown={(e) => onResizePointerDown(e, mesa.id)}
                  onPointerMove={onResizePointerMove}
                  onPointerUp={(e) => onResizePointerUp(e, mesa.id)}
                  style={{ touchAction: "none" }}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand border-2 border-bg cursor-nwse-resize"
                />
              )}
            </button>
          );
        })}
        {mesas.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-text-faint text-sm">
            Sin mesas en esta zona todavía.
          </p>
        )}
      </div>
    </section>
  );
}

function EstiloMesaPanel({
  mesa,
  estilo,
  onCambiar,
  onCerrar,
}: {
  mesa: MesaPlano;
  estilo: Estilo;
  onCambiar: (next: Estilo) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-end gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">Mesa {mesa.numero}</p>
      <Select
        label="Forma"
        value={estilo.forma}
        onChange={(e) =>
          onCambiar({ ...estilo, forma: e.target.value as "REDONDA" | "RECTANGULAR" })
        }
        className="w-40"
      >
        <option value="RECTANGULAR">Rectangular</option>
        <option value="REDONDA">Redonda</option>
      </Select>
      <Input
        label="Ancho (px)"
        type="number"
        min={TAMANO_MIN}
        max={TAMANO_MAX}
        value={estilo.ancho}
        onChange={(e) => onCambiar({ ...estilo, ancho: Number(e.target.value) })}
        className="w-28"
      />
      <Input
        label="Alto (px)"
        type="number"
        min={TAMANO_MIN}
        max={TAMANO_MAX}
        value={estilo.alto}
        onChange={(e) => onCambiar({ ...estilo, alto: Number(e.target.value) })}
        className="w-28"
      />
      <p className="text-xs text-text-faint basis-full">
        También puedes arrastrar el punto verde de la esquina de la mesa para cambiar el tamaño.
      </p>
      <Button type="button" variant="ghost" onClick={onCerrar}>
        Cerrar
      </Button>
    </div>
  );
}

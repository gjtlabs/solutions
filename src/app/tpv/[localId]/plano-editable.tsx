"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  moverMesa,
  actualizarEstiloMesa,
  moverZona,
  actualizarTamanoZona,
} from "./mesas/actions";

export type MesaPlano = {
  id: string;
  numero: string;
  capacidad: number;
  posicionX: number; // % relativo al lienzo de su zona
  posicionY: number;
  forma: "REDONDA" | "RECTANGULAR";
  ancho: number; // px — fijo, no depende del tamaño de la zona
  alto: number;
  ocupada: boolean;
};

export type ZonaPlano = {
  id: string;
  nombre: string;
  posicionX: number; // % relativo al lienzo del local
  posicionY: number;
  ancho: number; // px
  alto: number;
  mesas: MesaPlano[];
};

type EstiloMesa = { forma: "REDONDA" | "RECTANGULAR"; ancho: number; alto: number };
type Tamano = { ancho: number; alto: number };
type Seleccion = { tipo: "zona"; id: string } | { tipo: "mesa"; id: string } | null;

// Umbral en px por debajo del cual un pointerdown+pointerup cuenta como
// "toque", no como arrastre.
const UMBRAL_ARRASTRE = 6;
const MESA_MIN = 50;
const MESA_MAX = 200;
const ZONA_ANCHO_MIN = 140;
const ZONA_ANCHO_MAX = 900;
const ZONA_ALTO_MIN = 120;
const ZONA_ALTO_MAX = 700;

export function PlanoEditable({ localId, zonas }: { localId: string; zonas: ZonaPlano[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);

  const [posicionesZona, setPosicionesZona] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(zonas.map((z) => [z.id, { x: z.posicionX, y: z.posicionY }])),
  );
  const [tamanosZona, setTamanosZona] = useState<Record<string, Tamano>>(() =>
    Object.fromEntries(zonas.map((z) => [z.id, { ancho: z.ancho, alto: z.alto }])),
  );

  const todasLasMesas = zonas.flatMap((z) => z.mesas);
  const [posicionesMesa, setPosicionesMesa] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(todasLasMesas.map((m) => [m.id, { x: m.posicionX, y: m.posicionY }])),
  );
  const [estilosMesa, setEstilosMesa] = useState<Record<string, EstiloMesa>>(() =>
    Object.fromEntries(
      todasLasMesas.map((m) => [m.id, { forma: m.forma, ancho: m.ancho, alto: m.alto }]),
    ),
  );

  const lienzoRef = useRef<HTMLDivElement>(null);
  const zonaRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const arrastreZona = useRef<{ id: string; startX: number; startY: number; distancia: number } | null>(
    null,
  );
  const redimensionZona = useRef<{
    id: string;
    startX: number;
    startY: number;
    anchoInicial: number;
    altoInicial: number;
  } | null>(null);
  const arrastreMesa = useRef<{
    id: string;
    zonaEl: HTMLDivElement;
    startX: number;
    startY: number;
    distancia: number;
  } | null>(null);
  const redimensionMesa = useRef<{
    id: string;
    startX: number;
    startY: number;
    anchoInicial: number;
    altoInicial: number;
  } | null>(null);

  // --- Zona: arrastrar para reposicionar (relativo al lienzo del local) ---

  function onZonaPointerDown(e: React.PointerEvent<HTMLDivElement>, zonaId: string) {
    if (!editando) return; // en modo vista la zona no hace nada al tocarla
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreZona.current = { id: zonaId, startX: e.clientX, startY: e.clientY, distancia: 0 };
  }

  function onZonaPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = arrastreZona.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    const rect = lienzoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosicionesZona((prev) => ({
      ...prev,
      [d.id]: { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) },
    }));
  }

  function onZonaPointerUp(zonaId: string) {
    const d = arrastreZona.current;
    arrastreZona.current = null;
    if (!d || d.id !== zonaId) return;

    if (d.distancia < UMBRAL_ARRASTRE) {
      setSeleccion({ tipo: "zona", id: zonaId });
      return;
    }
    const pos = posicionesZona[zonaId];
    if (pos) {
      startTransition(() => {
        moverZona(localId, zonaId, pos.x, pos.y);
      });
    }
  }

  // --- Zona: arrastrar la esquina para redimensionar ---

  function onZonaResizePointerDown(e: React.PointerEvent<HTMLSpanElement>, zonaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const actual = tamanosZona[zonaId];
    redimensionZona.current = {
      id: zonaId,
      startX: e.clientX,
      startY: e.clientY,
      anchoInicial: actual.ancho,
      altoInicial: actual.alto,
    };
  }

  function onZonaResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const r = redimensionZona.current;
    if (!r) return;
    const ancho = Math.min(ZONA_ANCHO_MAX, Math.max(ZONA_ANCHO_MIN, r.anchoInicial + (e.clientX - r.startX)));
    const alto = Math.min(ZONA_ALTO_MAX, Math.max(ZONA_ALTO_MIN, r.altoInicial + (e.clientY - r.startY)));
    setTamanosZona((prev) => ({ ...prev, [r.id]: { ancho, alto } }));
  }

  function onZonaResizePointerUp(e: React.PointerEvent<HTMLSpanElement>, zonaId: string) {
    e.stopPropagation();
    const r = redimensionZona.current;
    redimensionZona.current = null;
    if (!r || r.id !== zonaId) return;
    startTransition(() => {
      const t = tamanosZona[zonaId];
      actualizarTamanoZona(localId, zonaId, t.ancho, t.alto);
    });
  }

  // --- Mesa: arrastrar para reposicionar (relativo al lienzo de su zona) ---

  function onMesaPointerDown(e: React.PointerEvent<HTMLButtonElement>, mesaId: string, zonaId: string) {
    const zonaEl = zonaRefs.current.get(zonaId);
    if (!zonaEl) return;
    e.stopPropagation(); // que no arrastre también la zona
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreMesa.current = { id: mesaId, zonaEl, startX: e.clientX, startY: e.clientY, distancia: 0 };
  }

  function onMesaPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const d = arrastreMesa.current;
    if (!d) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!editando) return;

    const rect = d.zonaEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosicionesMesa((prev) => ({
      ...prev,
      [d.id]: { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) },
    }));
  }

  function onMesaPointerUp(mesaId: string) {
    const d = arrastreMesa.current;
    arrastreMesa.current = null;
    if (!d || d.id !== mesaId) return;

    if (!editando) {
      router.push(`/tpv/${localId}/mesa/${mesaId}`);
      return;
    }
    if (d.distancia < UMBRAL_ARRASTRE) {
      setSeleccion({ tipo: "mesa", id: mesaId });
      return;
    }
    const pos = posicionesMesa[mesaId];
    if (pos) {
      startTransition(() => {
        moverMesa(localId, mesaId, pos.x, pos.y);
      });
    }
  }

  // --- Mesa: arrastrar la esquina para redimensionar ---

  function onMesaResizePointerDown(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const actual = estilosMesa[mesaId];
    redimensionMesa.current = {
      id: mesaId,
      startX: e.clientX,
      startY: e.clientY,
      anchoInicial: actual.ancho,
      altoInicial: actual.alto,
    };
  }

  function onMesaResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const r = redimensionMesa.current;
    if (!r) return;
    const ancho = Math.min(MESA_MAX, Math.max(MESA_MIN, r.anchoInicial + (e.clientX - r.startX)));
    const alto = Math.min(MESA_MAX, Math.max(MESA_MIN, r.altoInicial + (e.clientY - r.startY)));
    setEstilosMesa((prev) => ({ ...prev, [r.id]: { ...prev[r.id], ancho, alto } }));
  }

  function onMesaResizePointerUp(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    const r = redimensionMesa.current;
    redimensionMesa.current = null;
    if (!r || r.id !== mesaId) return;
    startTransition(() => {
      const estilo = estilosMesa[mesaId];
      actualizarEstiloMesa(localId, mesaId, estilo.forma, estilo.ancho, estilo.alto);
    });
  }

  function guardarEstiloMesa(mesaId: string, next: EstiloMesa) {
    setEstilosMesa((prev) => ({ ...prev, [mesaId]: next }));
    startTransition(() => {
      actualizarEstiloMesa(localId, mesaId, next.forma, next.ancho, next.alto);
    });
  }

  function guardarTamanoZona(zonaId: string, next: Tamano) {
    setTamanosZona((prev) => ({ ...prev, [zonaId]: next }));
    startTransition(() => {
      actualizarTamanoZona(localId, zonaId, next.ancho, next.alto);
    });
  }

  const zonaSeleccionada =
    seleccion?.tipo === "zona" ? zonas.find((z) => z.id === seleccion.id) : undefined;
  const mesaSeleccionada =
    seleccion?.tipo === "mesa" ? todasLasMesas.find((m) => m.id === seleccion.id) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {editando
            ? "Arrastra las zonas y las mesas para colocarlas. Toca una para cambiar su tamaño (o arrastra su esquina)."
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

      <div
        ref={lienzoRef}
        className={`relative h-[42rem] w-full rounded-md border bg-bg ${
          editando ? "border-dashed border-border-strong" : "border-border"
        }`}
      >
        {zonas.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-text-faint text-sm">
            Todavía no hay zonas.
          </p>
        )}

        {zonas.map((zona) => {
          const posZona = posicionesZona[zona.id] ?? { x: zona.posicionX, y: zona.posicionY };
          const tamZona = tamanosZona[zona.id] ?? { ancho: zona.ancho, alto: zona.alto };
          const zonaSeleccionadaAqui = seleccion?.tipo === "zona" && seleccion.id === zona.id;

          return (
            <div
              key={zona.id}
              ref={(el) => {
                if (el) zonaRefs.current.set(zona.id, el);
                else zonaRefs.current.delete(zona.id);
              }}
              onPointerDown={(e) => onZonaPointerDown(e, zona.id)}
              onPointerMove={onZonaPointerMove}
              onPointerUp={() => onZonaPointerUp(zona.id)}
              style={{
                left: `${posZona.x}%`,
                top: `${posZona.y}%`,
                width: tamZona.ancho,
                height: tamZona.alto,
                transform: "translate(-50%, -50%)",
                touchAction: editando ? "none" : undefined,
              }}
              className={`absolute rounded-md border bg-surface ${
                zonaSeleccionadaAqui ? "border-brand border-2" : "border-border-strong"
              } ${editando ? "cursor-move" : ""}`}
            >
              <span className="pointer-events-none absolute top-2 left-2.5 text-sm font-semibold text-text-muted">
                {zona.nombre}
              </span>

              {zona.mesas.map((mesa) => {
                const pos = posicionesMesa[mesa.id] ?? { x: mesa.posicionX, y: mesa.posicionY };
                const estilo =
                  estilosMesa[mesa.id] ?? { forma: mesa.forma, ancho: mesa.ancho, alto: mesa.alto };
                const mesaSeleccionadaAqui = seleccion?.tipo === "mesa" && seleccion.id === mesa.id;

                return (
                  <button
                    key={mesa.id}
                    type="button"
                    onPointerDown={(e) => onMesaPointerDown(e, mesa.id, zona.id)}
                    onPointerMove={onMesaPointerMove}
                    onPointerUp={() => onMesaPointerUp(mesa.id)}
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
                      mesaSeleccionadaAqui ? "border-brand border-2" : "border-border-strong"
                    }`}
                  >
                    <span className="text-lg font-semibold text-text leading-none">
                      {mesa.numero}
                    </span>
                    <span className="text-xs text-text-faint leading-none">{mesa.capacidad}p</span>
                    {!editando && (
                      <Badge semantic={mesa.ocupada ? "info" : "neutral"} className="mt-0.5">
                        {mesa.ocupada ? "Ocupada" : "Libre"}
                      </Badge>
                    )}
                    {editando && mesaSeleccionadaAqui && (
                      <span
                        role="presentation"
                        onPointerDown={(e) => onMesaResizePointerDown(e, mesa.id)}
                        onPointerMove={onMesaResizePointerMove}
                        onPointerUp={(e) => onMesaResizePointerUp(e, mesa.id)}
                        style={{ touchAction: "none" }}
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand border-2 border-bg cursor-nwse-resize"
                      />
                    )}
                  </button>
                );
              })}

              {editando && zonaSeleccionadaAqui && (
                <span
                  role="presentation"
                  onPointerDown={(e) => onZonaResizePointerDown(e, zona.id)}
                  onPointerMove={onZonaResizePointerMove}
                  onPointerUp={(e) => onZonaResizePointerUp(e, zona.id)}
                  style={{ touchAction: "none" }}
                  className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-brand border-2 border-bg cursor-nwse-resize"
                />
              )}
            </div>
          );
        })}
      </div>

      {editando && zonaSeleccionada && (
        <EstiloZonaPanel
          key={zonaSeleccionada.id}
          zona={zonaSeleccionada}
          tamano={tamanosZona[zonaSeleccionada.id]}
          onCambiar={(next) => guardarTamanoZona(zonaSeleccionada.id, next)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
      {editando && mesaSeleccionada && (
        <EstiloMesaPanel
          key={mesaSeleccionada.id}
          mesa={mesaSeleccionada}
          estilo={estilosMesa[mesaSeleccionada.id]}
          onCambiar={(next) => guardarEstiloMesa(mesaSeleccionada.id, next)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
    </div>
  );
}

function EstiloZonaPanel({
  zona,
  tamano,
  onCambiar,
  onCerrar,
}: {
  zona: ZonaPlano;
  tamano: Tamano;
  onCambiar: (next: Tamano) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-end gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">Zona: {zona.nombre}</p>
      <Input
        label="Ancho (px)"
        type="number"
        min={ZONA_ANCHO_MIN}
        max={ZONA_ANCHO_MAX}
        value={tamano.ancho}
        onChange={(e) => onCambiar({ ...tamano, ancho: Number(e.target.value) })}
        className="w-28"
      />
      <Input
        label="Alto (px)"
        type="number"
        min={ZONA_ALTO_MIN}
        max={ZONA_ALTO_MAX}
        value={tamano.alto}
        onChange={(e) => onCambiar({ ...tamano, alto: Number(e.target.value) })}
        className="w-28"
      />
      <p className="text-xs text-text-faint basis-full">
        El nombre se cambia desde &ldquo;Gestionar mesas&rdquo;. Arrastra el punto de la esquina
        para cambiar el tamaño directamente sobre el plano.
      </p>
      <Button type="button" variant="ghost" onClick={onCerrar}>
        Cerrar
      </Button>
    </div>
  );
}

function EstiloMesaPanel({
  mesa,
  estilo,
  onCambiar,
  onCerrar,
}: {
  mesa: MesaPlano;
  estilo: EstiloMesa;
  onCambiar: (next: EstiloMesa) => void;
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
        min={MESA_MIN}
        max={MESA_MAX}
        value={estilo.ancho}
        onChange={(e) => onCambiar({ ...estilo, ancho: Number(e.target.value) })}
        className="w-28"
      />
      <Input
        label="Alto (px)"
        type="number"
        min={MESA_MIN}
        max={MESA_MAX}
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

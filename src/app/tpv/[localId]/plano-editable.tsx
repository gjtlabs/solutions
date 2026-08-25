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
  actualizarPuntosZona,
  actualizarColorZona,
  crearElemento,
  moverElemento,
  actualizarElemento,
  borrarElemento,
} from "./mesas/actions";
import { ElementoIcono, NOMBRE_ELEMENTO, type TipoElemento } from "./elemento-icono";

export type Punto = { x: number; y: number };

export type MesaPlano = {
  id: string;
  numero: string;
  capacidad: number;
  posicionX: number; // % relativo al rectángulo que envuelve a su zona
  posicionY: number;
  forma: "REDONDA" | "RECTANGULAR";
  ancho: number; // px — fijo, no depende del tamaño de la zona
  alto: number;
  ocupada: boolean;
};

export type ZonaPlano = {
  id: string;
  nombre: string;
  puntos: Punto[]; // % del lienzo del local, forma libre
  color: string;
  mesas: MesaPlano[];
};

export type ElementoPlanoData = {
  id: string;
  tipo: TipoElemento;
  posicionX: number; // % relativo al lienzo del local
  posicionY: number;
  ancho: number; // px
  alto: number;
  rotacion: number; // grados, 0/90/180/270
};

type EstiloMesa = { forma: "REDONDA" | "RECTANGULAR"; ancho: number; alto: number };
type EstiloElemento = { ancho: number; alto: number; rotacion: number };
type Seleccion =
  | { tipo: "zona"; id: string }
  | { tipo: "mesa"; id: string }
  | { tipo: "elemento"; id: string }
  | null;

const UMBRAL_ARRASTRE = 6;
const MESA_MIN = 50;
const MESA_MAX = 200;
const ELEMENTO_MIN = 10;
const ELEMENTO_MAX = 300;
const TIPOS_ELEMENTO: TipoElemento[] = ["PUERTA", "ESCALERA", "PARED"];

export const COLOR_ZONA: Record<string, { fill: string; borde: string; nombre: string }> = {
  neutro: { fill: "var(--color-surface)", borde: "var(--color-border-strong)", nombre: "Neutro" },
  azul: { fill: "var(--zona-azul-fill)", borde: "var(--zona-azul-borde)", nombre: "Azul" },
  ocre: { fill: "var(--zona-ocre-fill)", borde: "var(--zona-ocre-borde)", nombre: "Ocre" },
  terracota: {
    fill: "var(--zona-terracota-fill)",
    borde: "var(--zona-terracota-borde)",
    nombre: "Terracota",
  },
  malva: { fill: "var(--zona-malva-fill)", borde: "var(--zona-malva-borde)", nombre: "Malva" },
  pizarra: { fill: "var(--zona-pizarra-fill)", borde: "var(--zona-pizarra-borde)", nombre: "Pizarra" },
};

function bboxDePuntos(puntos: Punto[]) {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: maxX - minX || 1, height: maxY - minY || 1 };
}

function puntoMedioLadoMasLargo(puntos: Punto[]): Punto[] {
  let mejorIdx = 0;
  let mejorDist = -1;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d > mejorDist) {
      mejorDist = d;
      mejorIdx = i;
    }
  }
  const a = puntos[mejorIdx];
  const b = puntos[(mejorIdx + 1) % puntos.length];
  const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const nuevos = [...puntos];
  nuevos.splice(mejorIdx + 1, 0, medio);
  return nuevos;
}

export function PlanoEditable({
  localId,
  zonas,
  elementos,
}: {
  localId: string;
  zonas: ZonaPlano[];
  elementos: ElementoPlanoData[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);

  const [puntosZona, setPuntosZona] = useState<Record<string, Punto[]>>(() =>
    Object.fromEntries(zonas.map((z) => [z.id, z.puntos])),
  );
  const [colorZona, setColorZona] = useState<Record<string, string>>(() =>
    Object.fromEntries(zonas.map((z) => [z.id, z.color])),
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

  const [posicionesElemento, setPosicionesElemento] = useState<
    Record<string, { x: number; y: number }>
  >(() => Object.fromEntries(elementos.map((el) => [el.id, { x: el.posicionX, y: el.posicionY }])));
  const [estilosElemento, setEstilosElemento] = useState<Record<string, EstiloElemento>>(() =>
    Object.fromEntries(
      elementos.map((el) => [el.id, { ancho: el.ancho, alto: el.alto, rotacion: el.rotacion }]),
    ),
  );

  const lienzoRef = useRef<HTMLDivElement>(null);

  const arrastreZona = useRef<{
    id: string;
    startX: number;
    startY: number;
    distancia: number;
    puntosIniciales: Punto[];
  } | null>(null);
  const arrastreVertice = useRef<{ zonaId: string; indice: number } | null>(null);
  const arrastreMesa = useRef<{
    id: string;
    zonaId: string;
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
  const arrastreElemento = useRef<{
    id: string;
    startX: number;
    startY: number;
    distancia: number;
  } | null>(null);
  const redimensionElemento = useRef<{
    id: string;
    startX: number;
    startY: number;
    anchoInicial: number;
    altoInicial: number;
  } | null>(null);

  function puntosDe(zonaId: string): Punto[] {
    const zona = zonas.find((z) => z.id === zonaId);
    return puntosZona[zonaId] ?? zona?.puntos ?? [];
  }

  // --- Zona: arrastrar el interior para mover toda la forma ---

  function onZonaPointerDown(e: React.PointerEvent<SVGPolygonElement>, zonaId: string) {
    if (!editando) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreZona.current = {
      id: zonaId,
      startX: e.clientX,
      startY: e.clientY,
      distancia: 0,
      puntosIniciales: puntosDe(zonaId),
    };
  }

  function onZonaPointerMove(e: React.PointerEvent<SVGPolygonElement>) {
    const d = arrastreZona.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);

    const rect = lienzoRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - d.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - d.startY) / rect.height) * 100;
    setPuntosZona((prev) => ({
      ...prev,
      [d.id]: d.puntosIniciales.map((p) => ({
        x: Math.min(98, Math.max(2, p.x + deltaX)),
        y: Math.min(98, Math.max(2, p.y + deltaY)),
      })),
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
    const puntos = puntosDe(zonaId);
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, puntos);
    });
  }

  // --- Zona: arrastrar un vértice suelto para reformar la zona ---

  function onVerticePointerDown(
    e: React.PointerEvent<HTMLSpanElement>,
    zonaId: string,
    indice: number,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreVertice.current = { zonaId, indice };
  }

  function onVerticePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    const d = arrastreVertice.current;
    if (!d || !lienzoRef.current) return;
    const rect = lienzoRef.current.getBoundingClientRect();
    const x = Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(98, Math.max(2, ((e.clientY - rect.top) / rect.height) * 100));
    setPuntosZona((prev) => {
      const actuales = prev[d.zonaId] ?? puntosDe(d.zonaId);
      const nuevos = actuales.map((p, i) => (i === d.indice ? { x, y } : p));
      return { ...prev, [d.zonaId]: nuevos };
    });
  }

  function onVerticePointerUp() {
    const d = arrastreVertice.current;
    arrastreVertice.current = null;
    if (!d) return;
    const puntos = puntosDe(d.zonaId);
    startTransition(() => {
      actualizarPuntosZona(localId, d.zonaId, puntos);
    });
  }

  function anadirVertice(zonaId: string) {
    const nuevos = puntoMedioLadoMasLargo(puntosDe(zonaId));
    setPuntosZona((prev) => ({ ...prev, [zonaId]: nuevos }));
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, nuevos);
    });
  }

  function eliminarVertice(zonaId: string, indice: number) {
    const actuales = puntosDe(zonaId);
    if (actuales.length <= 3) return; // un polígono no puede tener menos de 3 vértices
    const nuevos = actuales.filter((_, i) => i !== indice);
    setPuntosZona((prev) => ({ ...prev, [zonaId]: nuevos }));
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, nuevos);
    });
  }

  function cambiarColorZona(zonaId: string, color: string) {
    setColorZona((prev) => ({ ...prev, [zonaId]: color }));
    startTransition(() => {
      actualizarColorZona(localId, zonaId, color);
    });
  }

  // --- Mesa: arrastrar para reposicionar (relativo al rectángulo de su zona) ---

  function onMesaPointerDown(e: React.PointerEvent<HTMLButtonElement>, mesaId: string, zonaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreMesa.current = { id: mesaId, zonaId, startX: e.clientX, startY: e.clientY, distancia: 0 };
  }

  function onMesaPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const d = arrastreMesa.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!editando) return;

    const bbox = bboxDePuntos(puntosDe(d.zonaId));
    const rect = lienzoRef.current.getBoundingClientRect();
    const outerX = ((e.clientX - rect.left) / rect.width) * 100;
    const outerY = ((e.clientY - rect.top) / rect.height) * 100;
    const relX = ((outerX - bbox.minX) / bbox.width) * 100;
    const relY = ((outerY - bbox.minY) / bbox.height) * 100;
    setPosicionesMesa((prev) => ({
      ...prev,
      [d.id]: { x: Math.min(98, Math.max(2, relX)), y: Math.min(98, Math.max(2, relY)) },
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
    const mesaProp = todasLasMesas.find((m) => m.id === mesaId);
    const actual = estilosMesa[mesaId] ??
      (mesaProp
        ? { forma: mesaProp.forma, ancho: mesaProp.ancho, alto: mesaProp.alto }
        : { forma: "RECTANGULAR" as const, ancho: 90, alto: 90 });
    setEstilosMesa((prev) => (mesaId in prev ? prev : { ...prev, [mesaId]: actual }));
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

  // --- Elemento: arrastrar para reposicionar (relativo al lienzo del local) ---

  function onElementoPointerDown(e: React.PointerEvent<HTMLDivElement>, elementoId: string) {
    if (!editando) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreElemento.current = { id: elementoId, startX: e.clientX, startY: e.clientY, distancia: 0 };
  }

  function onElementoPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = arrastreElemento.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    const rect = lienzoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosicionesElemento((prev) => ({
      ...prev,
      [d.id]: { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) },
    }));
  }

  function onElementoPointerUp(elementoId: string) {
    const d = arrastreElemento.current;
    arrastreElemento.current = null;
    if (!d || d.id !== elementoId) return;

    if (d.distancia < UMBRAL_ARRASTRE) {
      setSeleccion({ tipo: "elemento", id: elementoId });
      return;
    }
    const pos = posicionesElemento[elementoId];
    if (pos) {
      startTransition(() => {
        moverElemento(localId, elementoId, pos.x, pos.y);
      });
    }
  }

  // --- Elemento: arrastrar la esquina para redimensionar ---

  function onElementoResizePointerDown(e: React.PointerEvent<HTMLSpanElement>, elementoId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const elementoProp = elementos.find((el) => el.id === elementoId);
    const actual = estilosElemento[elementoId] ??
      (elementoProp
        ? { ancho: elementoProp.ancho, alto: elementoProp.alto, rotacion: elementoProp.rotacion }
        : { ancho: 60, alto: 20, rotacion: 0 });
    setEstilosElemento((prev) => (elementoId in prev ? prev : { ...prev, [elementoId]: actual }));
    redimensionElemento.current = {
      id: elementoId,
      startX: e.clientX,
      startY: e.clientY,
      anchoInicial: actual.ancho,
      altoInicial: actual.alto,
    };
  }

  function onElementoResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const r = redimensionElemento.current;
    if (!r) return;
    const ancho = Math.min(ELEMENTO_MAX, Math.max(ELEMENTO_MIN, r.anchoInicial + (e.clientX - r.startX)));
    const alto = Math.min(ELEMENTO_MAX, Math.max(ELEMENTO_MIN, r.altoInicial + (e.clientY - r.startY)));
    setEstilosElemento((prev) => ({ ...prev, [r.id]: { ...prev[r.id], ancho, alto } }));
  }

  function onElementoResizePointerUp(e: React.PointerEvent<HTMLSpanElement>, elementoId: string) {
    e.stopPropagation();
    const r = redimensionElemento.current;
    redimensionElemento.current = null;
    if (!r || r.id !== elementoId) return;
    startTransition(() => {
      const estilo = estilosElemento[elementoId];
      actualizarElemento(localId, elementoId, estilo.ancho, estilo.alto, estilo.rotacion);
    });
  }

  function guardarEstiloElemento(elementoId: string, next: EstiloElemento) {
    setEstilosElemento((prev) => ({ ...prev, [elementoId]: next }));
    startTransition(() => {
      actualizarElemento(localId, elementoId, next.ancho, next.alto, next.rotacion);
    });
  }

  function anadirElemento(tipo: TipoElemento) {
    startTransition(() => {
      crearElemento(localId, tipo);
    });
  }

  function eliminarElemento(elementoId: string) {
    setSeleccion(null);
    startTransition(() => {
      borrarElemento(localId, elementoId);
    });
  }

  const zonaSeleccionada =
    seleccion?.tipo === "zona" ? zonas.find((z) => z.id === seleccion.id) : undefined;
  const mesaSeleccionada =
    seleccion?.tipo === "mesa" ? todasLasMesas.find((m) => m.id === seleccion.id) : undefined;
  const elementoSeleccionado =
    seleccion?.tipo === "elemento" ? elementos.find((el) => el.id === seleccion.id) : undefined;

  const mesasParaRenderizar = zonas.flatMap((zona) => {
    const bbox = bboxDePuntos(puntosDe(zona.id));
    return zona.mesas.map((mesa) => ({ mesa, zonaId: zona.id, bbox }));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {editando
            ? "Arrastra el interior de una zona para moverla, o sus vértices para darle forma. Doble toque en un vértice lo borra."
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

      {editando && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-muted">Añadir elemento:</span>
          {TIPOS_ELEMENTO.map((tipo) => (
            <Button key={tipo} type="button" variant="secondary" onClick={() => anadirElemento(tipo)}>
              + {NOMBRE_ELEMENTO[tipo]}
            </Button>
          ))}
        </div>
      )}

      <div
        ref={lienzoRef}
        className={`relative aspect-[16/10] w-full rounded-md border bg-bg ${
          editando ? "border-dashed border-border-strong" : "border-border"
        }`}
      >
        {zonas.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-text-faint text-sm">
            Todavía no hay zonas.
          </p>
        )}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {zonas.map((zona) => {
            const puntos = puntosZona[zona.id] ?? zona.puntos;
            const colores = COLOR_ZONA[colorZona[zona.id] ?? zona.color] ?? COLOR_ZONA.neutro;
            const seleccionadaAqui = seleccion?.tipo === "zona" && seleccion.id === zona.id;
            return (
              <polygon
                key={zona.id}
                points={puntos.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={colores.fill}
                stroke={seleccionadaAqui ? "var(--color-brand)" : colores.borde}
                strokeWidth={seleccionadaAqui ? 0.6 : 0.4}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "auto", cursor: editando ? "move" : "default" }}
                onPointerDown={(e) => onZonaPointerDown(e, zona.id)}
                onPointerMove={onZonaPointerMove}
                onPointerUp={() => onZonaPointerUp(zona.id)}
              />
            );
          })}
        </svg>

        {zonas.map((zona) => {
          const puntos = puntosZona[zona.id] ?? zona.puntos;
          const bbox = bboxDePuntos(puntos);
          return (
            <span
              key={`${zona.id}-etiqueta`}
              className="pointer-events-none absolute text-sm font-semibold text-text-muted"
              style={{ left: `${bbox.minX}%`, top: `${bbox.minY}%`, transform: "translate(4px, 4px)" }}
            >
              {zona.nombre}
            </span>
          );
        })}

        {mesasParaRenderizar.map(({ mesa, zonaId, bbox }) => {
          const posRel = posicionesMesa[mesa.id] ?? { x: mesa.posicionX, y: mesa.posicionY };
          const outerX = bbox.minX + (posRel.x / 100) * bbox.width;
          const outerY = bbox.minY + (posRel.y / 100) * bbox.height;
          const estilo =
            estilosMesa[mesa.id] ?? { forma: mesa.forma, ancho: mesa.ancho, alto: mesa.alto };
          const mesaSeleccionadaAqui = seleccion?.tipo === "mesa" && seleccion.id === mesa.id;

          return (
            <button
              key={mesa.id}
              type="button"
              onPointerDown={(e) => onMesaPointerDown(e, mesa.id, zonaId)}
              onPointerMove={onMesaPointerMove}
              onPointerUp={() => onMesaPointerUp(mesa.id)}
              style={{
                left: `${outerX}%`,
                top: `${outerY}%`,
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
              <span className="text-lg font-semibold text-text leading-none">{mesa.numero}</span>
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

        {elementos.map((elemento) => {
          const pos = posicionesElemento[elemento.id] ?? { x: elemento.posicionX, y: elemento.posicionY };
          const estilo =
            estilosElemento[elemento.id] ??
            { ancho: elemento.ancho, alto: elemento.alto, rotacion: elemento.rotacion };
          const elementoSeleccionadoAqui = seleccion?.tipo === "elemento" && seleccion.id === elemento.id;

          return (
            <div
              key={elemento.id}
              onPointerDown={(e) => onElementoPointerDown(e, elemento.id)}
              onPointerMove={onElementoPointerMove}
              onPointerUp={() => onElementoPointerUp(elemento.id)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: estilo.ancho,
                height: estilo.alto,
                transform: `translate(-50%, -50%) rotate(${estilo.rotacion}deg)`,
                touchAction: editando ? "none" : undefined,
              }}
              className={`absolute flex items-center justify-center ${
                elemento.tipo === "PARED" ? "bg-text-faint rounded-sm" : ""
              } ${
                editando
                  ? `cursor-move ${elementoSeleccionadoAqui ? "outline outline-2 outline-brand outline-offset-2" : ""}`
                  : ""
              }`}
            >
              <ElementoIcono tipo={elemento.tipo} />
              {editando && elementoSeleccionadoAqui && (
                <span
                  role="presentation"
                  onPointerDown={(e) => onElementoResizePointerDown(e, elemento.id)}
                  onPointerMove={onElementoResizePointerMove}
                  onPointerUp={(e) => onElementoResizePointerUp(e, elemento.id)}
                  style={{ touchAction: "none" }}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand border-2 border-bg cursor-nwse-resize"
                />
              )}
            </div>
          );
        })}

        {editando &&
          zonaSeleccionada &&
          puntosDe(zonaSeleccionada.id).map((p, i) => (
            <span
              key={`${zonaSeleccionada.id}-v-${i}`}
              onPointerDown={(e) => onVerticePointerDown(e, zonaSeleccionada.id, i)}
              onPointerMove={onVerticePointerMove}
              onPointerUp={onVerticePointerUp}
              onDoubleClick={() => eliminarVertice(zonaSeleccionada.id, i)}
              style={{ left: `${p.x}%`, top: `${p.y}%`, touchAction: "none" }}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand border-2 border-bg cursor-move"
              title="Arrastra para mover, doble toque para borrar este vértice"
            />
          ))}
      </div>

      {editando && zonaSeleccionada && (
        <EstiloZonaPanel
          key={zonaSeleccionada.id}
          zona={zonaSeleccionada}
          color={colorZona[zonaSeleccionada.id] ?? zonaSeleccionada.color}
          numVertices={puntosDe(zonaSeleccionada.id).length}
          onCambiarColor={(c) => cambiarColorZona(zonaSeleccionada.id, c)}
          onAnadirVertice={() => anadirVertice(zonaSeleccionada.id)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
      {editando && mesaSeleccionada && (
        <EstiloMesaPanel
          key={mesaSeleccionada.id}
          mesa={mesaSeleccionada}
          estilo={
            estilosMesa[mesaSeleccionada.id] ?? {
              forma: mesaSeleccionada.forma,
              ancho: mesaSeleccionada.ancho,
              alto: mesaSeleccionada.alto,
            }
          }
          onCambiar={(next) => guardarEstiloMesa(mesaSeleccionada.id, next)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
      {editando && elementoSeleccionado && (
        <EstiloElementoPanel
          key={elementoSeleccionado.id}
          elemento={elementoSeleccionado}
          estilo={
            estilosElemento[elementoSeleccionado.id] ?? {
              ancho: elementoSeleccionado.ancho,
              alto: elementoSeleccionado.alto,
              rotacion: elementoSeleccionado.rotacion,
            }
          }
          onCambiar={(next) => guardarEstiloElemento(elementoSeleccionado.id, next)}
          onBorrar={() => eliminarElemento(elementoSeleccionado.id)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
    </div>
  );
}

function EstiloZonaPanel({
  zona,
  color,
  numVertices,
  onCambiarColor,
  onAnadirVertice,
  onCerrar,
}: {
  zona: ZonaPlano;
  color: string;
  numVertices: number;
  onCambiarColor: (color: string) => void;
  onAnadirVertice: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-center gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">Zona: {zona.nombre}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Color</span>
        {Object.entries(COLOR_ZONA).map(([clave, valores]) => (
          <button
            key={clave}
            type="button"
            title={valores.nombre}
            onClick={() => onCambiarColor(clave)}
            style={{ background: valores.fill, borderColor: valores.borde }}
            className={`h-7 w-7 rounded-full border-2 ${
              color === clave ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
            }`}
          />
        ))}
      </div>
      <Button type="button" variant="secondary" onClick={onAnadirVertice}>
        + Añadir vértice
      </Button>
      <p className="text-xs text-text-faint basis-full">
        {numVertices} vértices. Arrastra el interior para mover toda la zona, o cada punto verde
        para darle forma — doble toque en un punto lo borra (mínimo 3).
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

function EstiloElementoPanel({
  elemento,
  estilo,
  onCambiar,
  onBorrar,
  onCerrar,
}: {
  elemento: ElementoPlanoData;
  estilo: EstiloElemento;
  onCambiar: (next: EstiloElemento) => void;
  onBorrar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-end gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">{NOMBRE_ELEMENTO[elemento.tipo]}</p>
      <Input
        label="Ancho (px)"
        type="number"
        min={ELEMENTO_MIN}
        max={ELEMENTO_MAX}
        value={estilo.ancho}
        onChange={(e) => onCambiar({ ...estilo, ancho: Number(e.target.value) })}
        className="w-28"
      />
      <Input
        label="Alto (px)"
        type="number"
        min={ELEMENTO_MIN}
        max={ELEMENTO_MAX}
        value={estilo.alto}
        onChange={(e) => onCambiar({ ...estilo, alto: Number(e.target.value) })}
        className="w-28"
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => onCambiar({ ...estilo, rotacion: (estilo.rotacion + 90) % 360 })}
      >
        Rotar 90°
      </Button>
      <Button type="button" variant="danger" onClick={onBorrar}>
        Borrar
      </Button>
      <Button type="button" variant="ghost" onClick={onCerrar}>
        Cerrar
      </Button>
    </div>
  );
}

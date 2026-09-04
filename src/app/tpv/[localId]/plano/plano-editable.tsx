"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  moverMesa,
  actualizarEstiloMesa,
  crearMesaEnZona,
  actualizarDatosMesa,
  actualizarPuntosZona,
  actualizarColorZona,
  crearElemento,
  moverElemento,
  actualizarElemento,
  borrarElemento,
  actualizarAltoPlano,
} from "../mesas/actions";
import { ElementoIcono, NOMBRE_ELEMENTO, type TipoElemento } from "./elemento-icono";
import { useAhora, formatearDuracion, inicioPendiente, type LineaEstadoResumen } from "@/lib/tiempo-transcurrido";

export type Punto = { x: number; y: number };

function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function campoEditable(destino: EventTarget | null) {
  if (!(destino instanceof HTMLElement)) return false;
  return destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.tagName === "SELECT";
}

export type MesaLinea = LineaEstadoResumen & { tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE" };

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
  // Hora (ISO) de la próxima reserva de hoy para esta mesa, si la hay y
  // todavía no ha pasado — solo un aviso, no bloquea usarla antes en otro
  // turno.
  proximaReserva: string | null;
  // Lo que lleva pedido la comanda abierta de esta mesa (si la hay) — para
  // pintar en la propia mesa el mismo resumen de bebida/comida pendiente
  // que antes vivía aparte, en el panel "Mesas en curso".
  horaApertura: string | null;
  lineas: MesaLinea[];
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
type DatosMesa = { numero: string; capacidad: number };
type EstiloElemento = { ancho: number; alto: number; rotacion: number };
// Las mesas admiten selección múltiple (para modificar varias a la vez);
// zonas y elementos se quedan en selección de uno solo, como antes.
type Seleccion =
  | { tipo: "zona"; id: string }
  | { tipo: "mesa"; ids: string[] }
  | { tipo: "elemento"; id: string }
  | null;

const UMBRAL_ARRASTRE = 6;
const MESA_MIN = 50;
const MESA_MAX = 200;
const ELEMENTO_MIN = 10;
const ELEMENTO_MAX = 300;
const TIPOS_ELEMENTO: TipoElemento[] = ["PUERTA", "ESCALERA", "PARED"];
const LIENZO_ALTO_MIN = 300;
const LIENZO_ALTO_MAX = 1400;
const PASO_TECLADO = 1;
const PASO_TECLADO_RAPIDO = 3;

type PuntoReferencia = { id: string; x: number; y: number };
type GuiaVisual = {
  lineaX?: number;
  lineaY?: number;
  espacioHorizontal?: { y: number; xIzq: number; xDer: number };
  espacioVertical?: { x: number; yArriba: number; yAbajo: number };
};

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

// --- Guías de alineación y espaciado, al estilo Figma/PowerPoint ---
//
// Mientras se arrastra una mesa o un elemento (en % del lienzo exterior), se
// compara su posición contra la de todas las demás mesas y elementos: si
// cae cerca de compartir la misma X o la misma Y con otra, se ajusta a
// coincidir exactamente y se marca una línea guía; si además queda entre
// dos referencias vecinas con el mismo hueco a cada lado, se ajusta a
// centrarse exactamente y se marca el indicador de espaciado igual.

const TOLERANCIA_GUIA = 1.2; // % del lienzo

function calcularGuia(
  x: number,
  y: number,
  referencias: PuntoReferencia[],
): { x: number; y: number; guia: GuiaVisual } {
  let nx = x;
  let ny = y;
  const guia: GuiaVisual = {};

  let mejorX: number | null = null;
  let distX = TOLERANCIA_GUIA;
  for (const r of referencias) {
    const d = Math.abs(r.x - x);
    if (d < distX) {
      distX = d;
      mejorX = r.x;
    }
  }
  if (mejorX !== null) {
    nx = mejorX;
    guia.lineaX = mejorX;
  }

  let mejorY: number | null = null;
  let distY = TOLERANCIA_GUIA;
  for (const r of referencias) {
    const d = Math.abs(r.y - y);
    if (d < distY) {
      distY = d;
      mejorY = r.y;
    }
  }
  if (mejorY !== null) {
    ny = mejorY;
    guia.lineaY = mejorY;
  }

  const toleranciaFila = TOLERANCIA_GUIA * 1.5;
  const enFila = referencias
    .filter((r) => Math.abs(r.y - ny) < toleranciaFila)
    .sort((a, b) => a.x - b.x);
  const izq = [...enFila].reverse().find((r) => r.x < nx - 0.1);
  const der = enFila.find((r) => r.x > nx + 0.1);
  if (izq && der) {
    const gapIzq = nx - izq.x;
    const gapDer = der.x - nx;
    if (Math.abs(gapIzq - gapDer) < TOLERANCIA_GUIA) {
      nx = (izq.x + der.x) / 2;
      guia.espacioHorizontal = { y: ny, xIzq: izq.x, xDer: der.x };
    }
  }

  const enColumna = referencias
    .filter((r) => Math.abs(r.x - nx) < toleranciaFila)
    .sort((a, b) => a.y - b.y);
  const arriba = [...enColumna].reverse().find((r) => r.y < ny - 0.1);
  const abajo = enColumna.find((r) => r.y > ny + 0.1);
  if (arriba && abajo) {
    const gapArriba = ny - arriba.y;
    const gapAbajo = abajo.y - ny;
    if (Math.abs(gapArriba - gapAbajo) < TOLERANCIA_GUIA) {
      ny = (arriba.y + abajo.y) / 2;
      guia.espacioVertical = { x: nx, yArriba: arriba.y, yAbajo: abajo.y };
    }
  }

  return { x: nx, y: ny, guia };
}

// --- Geometría de zona rectilínea (solo ángulos rectos, para dar sensación
// de plano arquitectónico en vez de formas dibujadas a mano) ---
//
// Cada lado de una zona es siempre horizontal o vertical. Eso hace que un
// vértice suelto NO se pueda arrastrar libremente (movería un lado a un
// ángulo que ya no sería recto): lo que se arrastra es un LADO entero,
// siempre en la única dirección perpendicular a sí mismo, así los dos
// vértices que lo forman se mueven a la vez y los lados vecinos (que van en
// la dirección contraria) no se desalinean. Para añadir una esquina nueva
// (convertir un rectángulo en una L, una U...) se mete una muesca de 4
// puntos en el lado más largo — es la única forma de crear un ángulo nuevo
// sin mover el resto de la zona.

function clampPunto(p: Punto): Punto {
  return { x: Math.min(98, Math.max(2, p.x)), y: Math.min(98, Math.max(2, p.y)) };
}

function centroide(puntos: Punto[]): Punto {
  const n = puntos.length;
  return {
    x: puntos.reduce((s, p) => s + p.x, 0) / n,
    y: puntos.reduce((s, p) => s + p.y, 0) / n,
  };
}

function ladoEsHorizontal(a: Punto, b: Punto): boolean {
  return Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
}

// Colapsa puntos redundantes: uno cuyos dos lados vecinos siguen la misma
// línea recta no aporta ninguna esquina real.
function simplificarColineales(puntos: Punto[]): Punto[] {
  let actual = puntos;
  let cambiado = true;
  while (cambiado && actual.length > 4) {
    cambiado = false;
    for (let i = 0; i < actual.length; i++) {
      const n = actual.length;
      const prev = actual[(i - 1 + n) % n];
      const cur = actual[i];
      const next = actual[(i + 1) % n];
      const rectaHorizontal = Math.abs(prev.y - cur.y) < 0.8 && Math.abs(cur.y - next.y) < 0.8;
      const rectaVertical = Math.abs(prev.x - cur.x) < 0.8 && Math.abs(cur.x - next.x) < 0.8;
      if (rectaHorizontal || rectaVertical) {
        actual = actual.filter((_, idx) => idx !== i);
        cambiado = true;
        break;
      }
    }
  }
  return actual;
}

// Mete una muesca rectangular (4 puntos nuevos) en el lado más largo, hacia
// el interior de la zona — el único gesto que añade una esquina sin tocar
// el resto de la forma.
function anadirMuesca(puntos: Punto[]): Punto[] {
  const n = puntos.length;
  let mejorIdx = 0;
  let mejorLongitud = -1;
  for (let i = 0; i < n; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % n];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d > mejorLongitud) {
      mejorLongitud = d;
      mejorIdx = i;
    }
  }
  const a = puntos[mejorIdx];
  const b = puntos[(mejorIdx + 1) % n];
  const horizontal = ladoEsHorizontal(a, b);
  const largo = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
  if (largo < 12) return puntos; // lado demasiado corto para una muesca útil

  const ancho = Math.max(6, Math.min(30, largo * 0.4));
  const profundidad = Math.max(6, Math.min(18, largo * 0.35));
  const t1 = (largo - ancho) / 2;
  const dir = horizontal ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);

  const q1 = horizontal ? { x: a.x + dir * t1, y: a.y } : { x: a.x, y: a.y + dir * t1 };
  const q4 = horizontal
    ? { x: a.x + dir * (t1 + ancho), y: a.y }
    : { x: a.x, y: a.y + dir * (t1 + ancho) };

  const centro = centroide(puntos);
  const medio = { x: (q1.x + q4.x) / 2, y: (q1.y + q4.y) / 2 };
  const signo = horizontal ? Math.sign(centro.y - medio.y) || 1 : Math.sign(centro.x - medio.x) || 1;

  const q2 = horizontal
    ? { x: q1.x, y: q1.y + signo * profundidad }
    : { x: q1.x + signo * profundidad, y: q1.y };
  const q3 = horizontal
    ? { x: q4.x, y: q4.y + signo * profundidad }
    : { x: q4.x + signo * profundidad, y: q4.y };

  const nuevos = [...puntos];
  nuevos.splice(mejorIdx + 1, 0, q1, q2, q3, q4);
  return nuevos.map(clampPunto);
}

// Quita el lado `indice` (entre los puntos indice e indice+1) si sus dos
// vecinos exteriores quedan alineados al reconectarlos directamente — así
// nunca se puede dejar un ángulo que no sea recto. Si no se puede, devuelve
// la misma lista (sin cambios) como señal de "no permitido".
function eliminarArista(puntos: Punto[], indice: number): Punto[] {
  const n = puntos.length;
  if (n <= 4) return puntos;
  const i1 = indice;
  const i2 = (indice + 1) % n;
  const prevIdx = (indice - 1 + n) % n;
  const nextIdx = (indice + 2) % n;
  const prev = puntos[prevIdx];
  const next = puntos[nextIdx];
  const mismaX = Math.abs(prev.x - next.x) < 0.8;
  const mismaY = Math.abs(prev.y - next.y) < 0.8;
  if (!mismaX && !mismaY) return puntos;

  const valorX = mismaX ? (prev.x + next.x) / 2 : null;
  const valorY = !mismaX && mismaY ? (prev.y + next.y) / 2 : null;
  const ajustados = puntos.map((p, idx) => {
    if (idx !== prevIdx && idx !== nextIdx) return p;
    return { x: valorX ?? p.x, y: valorY ?? p.y };
  });
  const sinLado = ajustados.filter((_, idx) => idx !== i1 && idx !== i2);
  return simplificarColineales(sinLado);
}

export function PlanoEditable({
  localId,
  zonas,
  elementos,
  planoAlto,
}: {
  localId: string;
  zonas: ZonaPlano[];
  elementos: ElementoPlanoData[];
  planoAlto: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [altoLienzo, setAltoLienzo] = useState<number>(planoAlto);
  const [guia, setGuia] = useState<GuiaVisual | null>(null);
  const ahora = useAhora(15000);

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
  const [datosMesa, setDatosMesa] = useState<Record<string, DatosMesa>>(() =>
    Object.fromEntries(todasLasMesas.map((m) => [m.id, { numero: m.numero, capacidad: m.capacidad }])),
  );
  const [erroresMesa, setErroresMesa] = useState<Record<string, string>>({});

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
  const arrastreArista = useRef<{
    zonaId: string;
    indice: number;
    eje: "x" | "y";
    puntosIniciales: Punto[];
    startClient: number;
  } | null>(null);
  // Cada mesa del grupo que se arrastra a la vez guarda su posición de
  // partida (relativa a su propia zona, y también en % del lienzo exterior
  // para poder calcular el mismo desplazamiento sobre zonas distintas).
  const arrastreMesa = useRef<{
    id: string;
    zonaId: string;
    startX: number;
    startY: number;
    distancia: number;
    grupo: { id: string; zonaId: string; xRelInicial: number; yRelInicial: number; outerXInicial: number; outerYInicial: number }[];
  } | null>(null);
  // Igual que arrastreMesa: si la mesa del tirador forma parte de una
  // selección múltiple, todo el grupo cambia de tamaño a la vez, cada una
  // aplicando el mismo incremento de ancho/alto a su propio tamaño inicial.
  const redimensionMesa = useRef<{
    id: string;
    startX: number;
    startY: number;
    grupo: { id: string; anchoInicial: number; altoInicial: number; forma: "REDONDA" | "RECTANGULAR" }[];
  } | null>(null);
  const arrastreElemento = useRef<{
    id: string;
    startX: number;
    startY: number;
    distancia: number;
    xInicial: number;
    yInicial: number;
  } | null>(null);
  const redimensionElemento = useRef<{
    id: string;
    startX: number;
    startY: number;
    anchoInicial: number;
    altoInicial: number;
  } | null>(null);
  const redimensionLienzo = useRef<{ startY: number; altoInicial: number } | null>(null);

  // Pila de "cómo deshacer" el último cambio confirmado (mover, redimensionar,
  // cambiar color/forma...) — Ctrl+Z hace pop y ejecuta. Cada entrada revierte
  // tanto el estado local como lo ya guardado en el servidor.
  const historialRef = useRef<Array<() => void>>([]);
  function registrarDeshacer(fn: () => void) {
    historialRef.current.push(fn);
    if (historialRef.current.length > 100) historialRef.current.shift();
  }

  function puntosDe(zonaId: string): Punto[] {
    const zona = zonas.find((z) => z.id === zonaId);
    return puntosZona[zonaId] ?? zona?.puntos ?? [];
  }
  function estiloMesaActual(mesaId: string): EstiloMesa {
    const prop = todasLasMesas.find((m) => m.id === mesaId);
    return (
      estilosMesa[mesaId] ??
      (prop ? { forma: prop.forma, ancho: prop.ancho, alto: prop.alto } : { forma: "RECTANGULAR", ancho: 90, alto: 90 })
    );
  }
  function datosMesaActual(mesaId: string): DatosMesa {
    const prop = todasLasMesas.find((m) => m.id === mesaId);
    return datosMesa[mesaId] ?? (prop ? { numero: prop.numero, capacidad: prop.capacidad } : { numero: "", capacidad: 2 });
  }
  function posMesaActual(mesaId: string): { x: number; y: number } {
    const prop = todasLasMesas.find((m) => m.id === mesaId);
    return posicionesMesa[mesaId] ?? (prop ? { x: prop.posicionX, y: prop.posicionY } : { x: 50, y: 50 });
  }
  function posElementoActual(elementoId: string): { x: number; y: number } {
    const prop = elementos.find((el) => el.id === elementoId);
    return posicionesElemento[elementoId] ?? (prop ? { x: prop.posicionX, y: prop.posicionY } : { x: 50, y: 50 });
  }
  function estiloElementoActual(elementoId: string): EstiloElemento {
    const prop = elementos.find((el) => el.id === elementoId);
    return (
      estilosElemento[elementoId] ??
      (prop ? { ancho: prop.ancho, alto: prop.alto, rotacion: prop.rotacion } : { ancho: 60, alto: 20, rotacion: 0 })
    );
  }

  // Posición actual (en % del lienzo exterior) de todas las mesas y
  // elementos salvo el que se está arrastrando — sirven de referencia para
  // las guías de alineación y espaciado.
  function obtenerReferencias(propioId: string): PuntoReferencia[] {
    const refs: PuntoReferencia[] = [];
    for (const zona of zonas) {
      const bbox = bboxDePuntos(puntosDe(zona.id));
      for (const mesa of zona.mesas) {
        const id = `mesa:${mesa.id}`;
        if (id === propioId) continue;
        const pos = posicionesMesa[mesa.id] ?? { x: mesa.posicionX, y: mesa.posicionY };
        refs.push({ id, x: bbox.minX + (pos.x / 100) * bbox.width, y: bbox.minY + (pos.y / 100) * bbox.height });
      }
    }
    for (const el of elementos) {
      const id = `elemento:${el.id}`;
      if (id === propioId) continue;
      const pos = posicionesElemento[el.id] ?? { x: el.posicionX, y: el.posicionY };
      refs.push({ id, x: pos.x, y: pos.y });
    }
    return refs;
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
    const antes = d.puntosIniciales;
    const puntos = puntosDe(zonaId);
    registrarDeshacer(() => {
      setPuntosZona((prev) => ({ ...prev, [zonaId]: antes }));
      startTransition(() => {
        actualizarPuntosZona(localId, zonaId, antes);
      });
    });
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, puntos);
    });
  }

  // --- Zona: arrastrar un lado entero, siempre en ángulo recto ---
  // Un lado horizontal solo se puede desplazar en vertical (cambia la "y" de
  // sus dos puntos) y uno vertical solo en horizontal — así los lados
  // vecinos, que van en la dirección contraria, nunca se desalinean.

  function onAristaPointerDown(e: React.PointerEvent<HTMLSpanElement>, zonaId: string, indice: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const puntos = puntosDe(zonaId);
    const n = puntos.length;
    const a = puntos[indice];
    const b = puntos[(indice + 1) % n];
    const horizontal = ladoEsHorizontal(a, b);
    arrastreArista.current = {
      zonaId,
      indice,
      eje: horizontal ? "y" : "x",
      puntosIniciales: puntos,
      startClient: horizontal ? e.clientY : e.clientX,
    };
  }

  function onAristaPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    const d = arrastreArista.current;
    if (!d || !lienzoRef.current) return;
    const rect = lienzoRef.current.getBoundingClientRect();
    const clientActual = d.eje === "y" ? e.clientY : e.clientX;
    const tramo = d.eje === "y" ? rect.height : rect.width;
    const deltaPct = ((clientActual - d.startClient) / tramo) * 100;

    const n = d.puntosIniciales.length;
    const i1 = d.indice;
    const i2 = (d.indice + 1) % n;
    const valorInicial = d.puntosIniciales[i1][d.eje];
    const valorNuevo = Math.min(98, Math.max(2, valorInicial + deltaPct));

    setPuntosZona((prev) => ({
      ...prev,
      [d.zonaId]: d.puntosIniciales.map((p, idx) =>
        idx === i1 || idx === i2 ? { ...p, [d.eje]: valorNuevo } : p,
      ),
    }));
  }

  function onAristaPointerUp() {
    const d = arrastreArista.current;
    arrastreArista.current = null;
    if (!d) return;
    const antes = d.puntosIniciales;
    const zonaId = d.zonaId;
    const puntos = puntosDe(zonaId);
    registrarDeshacer(() => {
      setPuntosZona((prev) => ({ ...prev, [zonaId]: antes }));
      startTransition(() => {
        actualizarPuntosZona(localId, zonaId, antes);
      });
    });
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, puntos);
    });
  }

  function onAristaDoubleClick(zonaId: string, indice: number) {
    const actuales = puntosDe(zonaId);
    const nuevos = eliminarArista(actuales, indice);
    if (nuevos === actuales) return; // el lado no se puede quitar sin romper un ángulo recto
    setPuntosZona((prev) => ({ ...prev, [zonaId]: nuevos }));
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, nuevos);
    });
  }

  function anadirEsquina(zonaId: string) {
    const actuales = puntosDe(zonaId);
    const nuevos = anadirMuesca(actuales);
    if (nuevos === actuales) return; // ningún lado es lo bastante largo para una muesca
    setPuntosZona((prev) => ({ ...prev, [zonaId]: nuevos }));
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, nuevos);
    });
  }

  function cambiarColorZona(zonaId: string, color: string) {
    const antes = colorZona[zonaId] ?? zonas.find((z) => z.id === zonaId)?.color ?? "neutro";
    setColorZona((prev) => ({ ...prev, [zonaId]: color }));
    registrarDeshacer(() => {
      setColorZona((prev) => ({ ...prev, [zonaId]: antes }));
      startTransition(() => {
        actualizarColorZona(localId, zonaId, antes);
      });
    });
    startTransition(() => {
      actualizarColorZona(localId, zonaId, color);
    });
  }

  // Vuelve a un rectángulo simple que ocupa el mismo rectángulo envolvente
  // que la forma actual — así ni la posición ni las mesas de dentro saltan,
  // solo desaparecen las muescas y los lados movidos.
  function restablecerFormaZona(zonaId: string) {
    const bbox = bboxDePuntos(puntosDe(zonaId));
    const rectangulo: Punto[] = [
      { x: bbox.minX, y: bbox.minY },
      { x: bbox.minX + bbox.width, y: bbox.minY },
      { x: bbox.minX + bbox.width, y: bbox.minY + bbox.height },
      { x: bbox.minX, y: bbox.minY + bbox.height },
    ];
    setPuntosZona((prev) => ({ ...prev, [zonaId]: rectangulo }));
    startTransition(() => {
      actualizarPuntosZona(localId, zonaId, rectangulo);
    });
  }

  // --- Mesa: arrastrar para reposicionar (relativo al rectángulo de su zona) ---

  function onMesaPointerDown(e: React.PointerEvent<HTMLButtonElement>, mesaId: string, zonaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    // Si la mesa pulsada ya forma parte de una selección múltiple, se
    // arrastran todas juntas; si no, solo ella (comportamiento de siempre).
    const enGrupo =
      seleccion?.tipo === "mesa" && seleccion.ids.length > 1 && seleccion.ids.includes(mesaId)
        ? seleccion.ids
        : [mesaId];
    const grupo = enGrupo.map((id) => {
      const zId = zonas.find((z) => z.mesas.some((m) => m.id === id))?.id ?? zonaId;
      const bbox = bboxDePuntos(puntosDe(zId));
      const rel = posMesaActual(id);
      return {
        id,
        zonaId: zId,
        xRelInicial: rel.x,
        yRelInicial: rel.y,
        outerXInicial: bbox.minX + (rel.x / 100) * bbox.width,
        outerYInicial: bbox.minY + (rel.y / 100) * bbox.height,
      };
    });
    arrastreMesa.current = { id: mesaId, zonaId, startX: e.clientX, startY: e.clientY, distancia: 0, grupo };
  }

  function onMesaPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const d = arrastreMesa.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!editando) return;

    const rect = lienzoRef.current.getBoundingClientRect();

    if (d.grupo.length <= 1) {
      const bbox = bboxDePuntos(puntosDe(d.zonaId));
      const outerX = ((e.clientX - rect.left) / rect.width) * 100;
      const outerY = ((e.clientY - rect.top) / rect.height) * 100;

      const { x: snapX, y: snapY, guia: guiaCalculada } = calcularGuia(
        outerX,
        outerY,
        obtenerReferencias(`mesa:${d.id}`),
      );
      setGuia(guiaCalculada);

      const relX = ((snapX - bbox.minX) / bbox.width) * 100;
      const relY = ((snapY - bbox.minY) / bbox.height) * 100;
      setPosicionesMesa((prev) => ({
        ...prev,
        [d.id]: { x: Math.min(98, Math.max(2, relX)), y: Math.min(98, Math.max(2, relY)) },
      }));
    } else {
      // Varias mesas a la vez: mismo desplazamiento para todas, sin guías
      // de alineación (pueden estar en zonas distintas, con bbox distinto).
      setGuia(null);
      const deltaOuterX = ((e.clientX - d.startX) / rect.width) * 100;
      const deltaOuterY = ((e.clientY - d.startY) / rect.height) * 100;
      setPosicionesMesa((prev) => {
        const copia = { ...prev };
        for (const g of d.grupo) {
          const bbox = bboxDePuntos(puntosDe(g.zonaId));
          const outerX = g.outerXInicial + deltaOuterX;
          const outerY = g.outerYInicial + deltaOuterY;
          const relX = ((outerX - bbox.minX) / bbox.width) * 100;
          const relY = ((outerY - bbox.minY) / bbox.height) * 100;
          copia[g.id] = { x: Math.min(98, Math.max(2, relX)), y: Math.min(98, Math.max(2, relY)) };
        }
        return copia;
      });
    }
  }

  function onMesaPointerUp(e: React.PointerEvent<HTMLButtonElement>, mesaId: string) {
    const d = arrastreMesa.current;
    arrastreMesa.current = null;
    setGuia(null);
    if (!d || d.id !== mesaId) return;

    if (!editando) {
      router.push(`/tpv/${localId}/mesa/${mesaId}`);
      return;
    }
    if (d.distancia < UMBRAL_ARRASTRE) {
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      setSeleccion((prev) => {
        if (multi && prev?.tipo === "mesa") {
          const yaEsta = prev.ids.includes(mesaId);
          const ids = yaEsta ? prev.ids.filter((id) => id !== mesaId) : [...prev.ids, mesaId];
          return ids.length > 0 ? { tipo: "mesa", ids } : null;
        }
        return { tipo: "mesa", ids: [mesaId] };
      });
      return;
    }

    const grupo = d.grupo;
    registrarDeshacer(() => {
      setPosicionesMesa((prev) => {
        const copia = { ...prev };
        for (const g of grupo) copia[g.id] = { x: g.xRelInicial, y: g.yRelInicial };
        return copia;
      });
      startTransition(() => {
        for (const g of grupo) moverMesa(localId, g.id, g.xRelInicial, g.yRelInicial);
      });
    });
    startTransition(() => {
      for (const g of grupo) {
        const pos = posicionesMesa[g.id] ?? { x: g.xRelInicial, y: g.yRelInicial };
        moverMesa(localId, g.id, pos.x, pos.y);
      }
    });
  }

  // --- Mesa: arrastrar la esquina para redimensionar ---

  function onMesaResizePointerDown(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    // Igual que al arrastrar: si la mesa del tirador ya está en una
    // selección múltiple, se redimensionan todas juntas.
    const enGrupo =
      seleccion?.tipo === "mesa" && seleccion.ids.length > 1 && seleccion.ids.includes(mesaId)
        ? seleccion.ids
        : [mesaId];
    const grupo = enGrupo.map((id) => {
      const actual = estiloMesaActual(id);
      return { id, anchoInicial: actual.ancho, altoInicial: actual.alto, forma: actual.forma };
    });
    setEstilosMesa((prev) => {
      const copia = { ...prev };
      for (const g of grupo) {
        if (!(g.id in copia)) copia[g.id] = { forma: g.forma, ancho: g.anchoInicial, alto: g.altoInicial };
      }
      return copia;
    });
    redimensionMesa.current = { id: mesaId, startX: e.clientX, startY: e.clientY, grupo };
  }

  function onMesaResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    const r = redimensionMesa.current;
    if (!r) return;
    const deltaX = e.clientX - r.startX;
    const deltaY = e.clientY - r.startY;
    setEstilosMesa((prev) => {
      const copia = { ...prev };
      for (const g of r.grupo) {
        const ancho = Math.min(MESA_MAX, Math.max(MESA_MIN, g.anchoInicial + deltaX));
        const alto = Math.min(MESA_MAX, Math.max(MESA_MIN, g.altoInicial + deltaY));
        copia[g.id] = { ...copia[g.id], ancho, alto };
      }
      return copia;
    });
  }

  function onMesaResizePointerUp(e: React.PointerEvent<HTMLSpanElement>, mesaId: string) {
    e.stopPropagation();
    const r = redimensionMesa.current;
    redimensionMesa.current = null;
    if (!r || r.id !== mesaId) return;
    const grupo = r.grupo;
    registrarDeshacer(() => {
      setEstilosMesa((prev) => {
        const copia = { ...prev };
        for (const g of grupo) copia[g.id] = { forma: g.forma, ancho: g.anchoInicial, alto: g.altoInicial };
        return copia;
      });
      startTransition(() => {
        for (const g of grupo) actualizarEstiloMesa(localId, g.id, g.forma, g.anchoInicial, g.altoInicial);
      });
    });
    startTransition(() => {
      for (const g of grupo) {
        const estilo = estilosMesa[g.id];
        actualizarEstiloMesa(localId, g.id, estilo.forma, estilo.ancho, estilo.alto);
      }
    });
  }

  function guardarEstiloMesa(mesaId: string, next: EstiloMesa) {
    const antes = estiloMesaActual(mesaId);
    setEstilosMesa((prev) => ({ ...prev, [mesaId]: next }));
    registrarDeshacer(() => {
      setEstilosMesa((prev) => ({ ...prev, [mesaId]: antes }));
      startTransition(() => {
        actualizarEstiloMesa(localId, mesaId, antes.forma, antes.ancho, antes.alto);
      });
    });
    startTransition(() => {
      actualizarEstiloMesa(localId, mesaId, next.forma, next.ancho, next.alto);
    });
  }

  // Cambia forma/ancho/alto de varias mesas a la vez — un único paso de
  // deshacer para todo el grupo, en vez de uno por mesa.
  function guardarEstiloMesasMultiple(ids: string[], cambios: Partial<EstiloMesa>) {
    const antes = ids.map((id) => ({ id, estilo: estiloMesaActual(id) }));
    setEstilosMesa((prev) => {
      const copia = { ...prev };
      for (const id of ids) copia[id] = { ...(copia[id] ?? estiloMesaActual(id)), ...cambios };
      return copia;
    });
    registrarDeshacer(() => {
      setEstilosMesa((prev) => {
        const copia = { ...prev };
        for (const a of antes) copia[a.id] = a.estilo;
        return copia;
      });
      startTransition(() => {
        for (const a of antes) actualizarEstiloMesa(localId, a.id, a.estilo.forma, a.estilo.ancho, a.estilo.alto);
      });
    });
    startTransition(() => {
      for (const id of ids) {
        const estilo = { ...estiloMesaActual(id), ...cambios };
        actualizarEstiloMesa(localId, id, estilo.forma, estilo.ancho, estilo.alto);
      }
    });
  }

  // Cambia los comensales de varias mesas a la vez — el número no se toca
  // (tiene que seguir siendo único por zona), solo la capacidad.
  function guardarCapacidadMesasMultiple(ids: string[], capacidad: number) {
    const antes = ids.map((id) => ({ id, datos: datosMesaActual(id) }));
    setDatosMesa((prev) => {
      const copia = { ...prev };
      for (const id of ids) copia[id] = { ...(copia[id] ?? datosMesaActual(id)), capacidad };
      return copia;
    });
    registrarDeshacer(() => {
      setDatosMesa((prev) => {
        const copia = { ...prev };
        for (const a of antes) copia[a.id] = a.datos;
        return copia;
      });
      startTransition(() => {
        for (const a of antes) actualizarDatosMesa(localId, a.id, a.datos.numero, a.datos.capacidad);
      });
    });
    startTransition(() => {
      for (const id of ids) {
        const datos = datosMesaActual(id);
        actualizarDatosMesa(localId, id, datos.numero, capacidad);
      }
    });
  }

  function anadirMesaEnZona(zonaId: string) {
    startTransition(() => {
      crearMesaEnZona(localId, zonaId);
    });
  }

  function guardarDatosMesa(mesaId: string, next: DatosMesa) {
    const antes = datosMesaActual(mesaId);
    setDatosMesa((prev) => ({ ...prev, [mesaId]: next }));
    registrarDeshacer(() => {
      setDatosMesa((prev) => ({ ...prev, [mesaId]: antes }));
      startTransition(async () => {
        await actualizarDatosMesa(localId, mesaId, antes.numero, antes.capacidad);
        setErroresMesa((prev) => {
          const copia = { ...prev };
          delete copia[mesaId];
          return copia;
        });
      });
    });
    startTransition(async () => {
      const resultado = await actualizarDatosMesa(localId, mesaId, next.numero, next.capacidad);
      setErroresMesa((prev) => {
        const copia = { ...prev };
        if (resultado?.error) copia[mesaId] = resultado.error;
        else delete copia[mesaId];
        return copia;
      });
    });
  }

  // --- Elemento: arrastrar para reposicionar (relativo al lienzo del local) ---

  function onElementoPointerDown(e: React.PointerEvent<HTMLDivElement>, elementoId: string) {
    if (!editando) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = posElementoActual(elementoId);
    arrastreElemento.current = {
      id: elementoId,
      startX: e.clientX,
      startY: e.clientY,
      distancia: 0,
      xInicial: pos.x,
      yInicial: pos.y,
    };
  }

  function onElementoPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = arrastreElemento.current;
    if (!d || !lienzoRef.current) return;
    d.distancia = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    const rect = lienzoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const { x: snapX, y: snapY, guia: guiaCalculada } = calcularGuia(
      x,
      y,
      obtenerReferencias(`elemento:${d.id}`),
    );
    setGuia(guiaCalculada);

    setPosicionesElemento((prev) => ({
      ...prev,
      [d.id]: { x: Math.min(98, Math.max(2, snapX)), y: Math.min(98, Math.max(2, snapY)) },
    }));
  }

  function onElementoPointerUp(elementoId: string) {
    const d = arrastreElemento.current;
    arrastreElemento.current = null;
    setGuia(null);
    if (!d || d.id !== elementoId) return;

    if (d.distancia < UMBRAL_ARRASTRE) {
      setSeleccion({ tipo: "elemento", id: elementoId });
      return;
    }
    const antes = { x: d.xInicial, y: d.yInicial };
    registrarDeshacer(() => {
      setPosicionesElemento((prev) => ({ ...prev, [elementoId]: antes }));
      startTransition(() => {
        moverElemento(localId, elementoId, antes.x, antes.y);
      });
    });
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
    const actual = estiloElementoActual(elementoId);
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
    const antes = { ancho: r.anchoInicial, alto: r.altoInicial, rotacion: estiloElementoActual(elementoId).rotacion };
    registrarDeshacer(() => {
      setEstilosElemento((prev) => ({ ...prev, [elementoId]: antes }));
      startTransition(() => {
        actualizarElemento(localId, elementoId, antes.ancho, antes.alto, antes.rotacion);
      });
    });
    startTransition(() => {
      const estilo = estilosElemento[elementoId];
      actualizarElemento(localId, elementoId, estilo.ancho, estilo.alto, estilo.rotacion);
    });
  }

  function guardarEstiloElemento(elementoId: string, next: EstiloElemento) {
    const antes = estiloElementoActual(elementoId);
    setEstilosElemento((prev) => ({ ...prev, [elementoId]: next }));
    registrarDeshacer(() => {
      setEstilosElemento((prev) => ({ ...prev, [elementoId]: antes }));
      startTransition(() => {
        actualizarElemento(localId, elementoId, antes.ancho, antes.alto, antes.rotacion);
      });
    });
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

  // --- Lienzo: arrastrar la esquina para cambiar su alto (el ancho es
  // fluido, marcado por el layout de la página) ---

  function onLienzoResizePointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    redimensionLienzo.current = { startY: e.clientY, altoInicial: altoLienzo };
  }

  function onLienzoResizePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    const r = redimensionLienzo.current;
    if (!r) return;
    const alto = Math.min(
      LIENZO_ALTO_MAX,
      Math.max(LIENZO_ALTO_MIN, r.altoInicial + (e.clientY - r.startY)),
    );
    setAltoLienzo(alto);
  }

  function onLienzoResizePointerUp() {
    const r = redimensionLienzo.current;
    redimensionLienzo.current = null;
    if (!r) return;
    startTransition(() => {
      actualizarAltoPlano(localId, altoLienzo);
    });
  }

  // --- Mover la selección con las flechas del teclado ---

  useEffect(() => {
    if (!editando || !seleccion) return;

    function onKeyDown(e: KeyboardEvent) {
      if (campoEditable(e.target)) return;
      const paso = e.shiftKey ? PASO_TECLADO_RAPIDO : PASO_TECLADO;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -paso;
      else if (e.key === "ArrowRight") dx = paso;
      else if (e.key === "ArrowUp") dy = -paso;
      else if (e.key === "ArrowDown") dy = paso;
      else return;
      e.preventDefault();

      if (!seleccion) return;

      if (seleccion.tipo === "mesa") {
        const ids = seleccion.ids;
        const antes = ids.map((id) => ({ id, pos: posMesaActual(id) }));
        const despues = antes.map((a) => ({
          id: a.id,
          pos: { x: Math.min(98, Math.max(2, a.pos.x + dx)), y: Math.min(98, Math.max(2, a.pos.y + dy)) },
        }));
        setPosicionesMesa((prev) => {
          const copia = { ...prev };
          for (const d of despues) copia[d.id] = d.pos;
          return copia;
        });
        registrarDeshacer(() => {
          setPosicionesMesa((prev) => {
            const copia = { ...prev };
            for (const a of antes) copia[a.id] = a.pos;
            return copia;
          });
          startTransition(() => {
            for (const a of antes) moverMesa(localId, a.id, a.pos.x, a.pos.y);
          });
        });
        startTransition(() => {
          for (const d of despues) moverMesa(localId, d.id, d.pos.x, d.pos.y);
        });
      } else if (seleccion.tipo === "elemento") {
        const el = elementos.find((el) => el.id === seleccion.id);
        if (!el) return;
        const antes = posElementoActual(el.id);
        const siguiente = {
          x: Math.min(98, Math.max(2, antes.x + dx)),
          y: Math.min(98, Math.max(2, antes.y + dy)),
        };
        setPosicionesElemento((prev) => ({ ...prev, [el.id]: siguiente }));
        registrarDeshacer(() => {
          setPosicionesElemento((prev) => ({ ...prev, [el.id]: antes }));
          startTransition(() => {
            moverElemento(localId, el.id, antes.x, antes.y);
          });
        });
        startTransition(() => {
          moverElemento(localId, el.id, siguiente.x, siguiente.y);
        });
      } else if (seleccion.tipo === "zona") {
        const zonaId = seleccion.id;
        const antes = puntosZona[zonaId] ?? zonas.find((z) => z.id === zonaId)?.puntos ?? [];
        const nuevos = antes.map((p) => ({
          x: Math.min(98, Math.max(2, p.x + dx)),
          y: Math.min(98, Math.max(2, p.y + dy)),
        }));
        setPuntosZona((prev) => ({ ...prev, [zonaId]: nuevos }));
        registrarDeshacer(() => {
          setPuntosZona((prev) => ({ ...prev, [zonaId]: antes }));
          startTransition(() => {
            actualizarPuntosZona(localId, zonaId, antes);
          });
        });
        startTransition(() => {
          actualizarPuntosZona(localId, zonaId, nuevos);
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editando, seleccion, elementos, zonas, puntosZona, localId]);

  // Ctrl+Z (o Cmd+Z) deshace el último cambio confirmado — mover, redimensionar,
  // cambiar color/forma... Se ignora dentro de un campo de texto para no pisar
  // el deshacer nativo del navegador ahí.
  useEffect(() => {
    if (!editando) return;

    function onKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.shiftKey || e.key.toLowerCase() !== "z") return;
      if (campoEditable(e.target)) return;
      e.preventDefault();
      const deshacer = historialRef.current.pop();
      deshacer?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editando]);

  const zonaSeleccionada =
    seleccion?.tipo === "zona" ? zonas.find((z) => z.id === seleccion.id) : undefined;
  const mesasSeleccionadasIds = seleccion?.tipo === "mesa" ? seleccion.ids : [];
  const mesasSeleccionadas = todasLasMesas.filter((m) => mesasSeleccionadasIds.includes(m.id));
  const elementoSeleccionado =
    seleccion?.tipo === "elemento" ? elementos.find((el) => el.id === seleccion.id) : undefined;

  const mesasParaRenderizar = zonas.flatMap((zona) => {
    const bbox = bboxDePuntos(puntosDe(zona.id));
    return zona.mesas.map((mesa) => ({ mesa, zonaId: zona.id, bbox }));
  });

  const puntosSeleccionados = zonaSeleccionada ? puntosDe(zonaSeleccionada.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {editando
            ? "Arrastra el interior de una zona para moverla, o el borde de un lado para desplazarlo — siempre en ángulo recto. Doble toque en un lado interior lo quita. Con algo seleccionado, muévelo también con las flechas del teclado. Mantén Ctrl (o Cmd) y toca varias mesas para seleccionarlas juntas y modificarlas a la vez. Ctrl+Z deshace el último cambio."
            : "Toca una mesa para abrir su comanda."}
        </p>
        <Button
          type="button"
          variant={editando ? "primary" : "secondary"}
          onClick={() => {
            setEditando((v) => !v);
            setSeleccion(null);
            setGuia(null);
            historialRef.current = [];
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

      {/*
        El marco exterior tiene el alto que el usuario arrastre (tirador en
        la esquina) con un tope de 55vh para que nunca obligue a bajar por
        la página; el lienzo interior mantiene siempre su proporción 16:10
        según el ancho disponible, así el contenido nunca se estira ni se
        aplasta al cambiar el alto del marco — si el marco queda más bajo
        que esa proporción, el "overflow: hidden" recorta en vez de
        deformar.
      */}
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-md border bg-bg ${
          editando ? "border-dashed border-border-strong" : "border-border"
        }`}
        style={{ height: altoLienzo, maxHeight: "82vh" }}
      >
        <div ref={lienzoRef} className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
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
          const datos = datosMesa[mesa.id] ?? { numero: mesa.numero, capacidad: mesa.capacidad };
          const mesaSeleccionadaAqui = seleccion?.tipo === "mesa" && seleccion.ids.includes(mesa.id);

          // Lo que antes se veía aparte, en el panel "Mesas en curso", ahora
          // se pinta en la propia mesa: bebida y comida por separado, con
          // cuánto llevan pendientes (o "servida" si ya está). Solo tiene
          // sentido si hay algo pedido — una mesa recién abierta sin líneas
          // todavía se queda con el "Ocupada" de siempre.
          const bebidas = mesa.lineas.filter((l) => l.tipo === "BEBIDA");
          const comidas = mesa.lineas.filter((l) => l.tipo !== "BEBIDA");
          const inicioBebidas = mesa.horaApertura ? inicioPendiente(bebidas, mesa.horaApertura) : null;
          const inicioComidas = mesa.horaApertura ? inicioPendiente(comidas, mesa.horaApertura) : null;
          const hayResumenPedido = mesa.ocupada && mesa.lineas.length > 0;

          return (
            <button
              key={mesa.id}
              type="button"
              onPointerDown={(e) => onMesaPointerDown(e, mesa.id, zonaId)}
              onPointerMove={onMesaPointerMove}
              onPointerUp={(e) => onMesaPointerUp(e, mesa.id)}
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
              <span className="text-lg font-semibold text-text leading-none">{datos.numero}</span>
              <span className="text-xs text-text-faint leading-none">{datos.capacidad}p</span>
              {!editando &&
                (hayResumenPedido ? (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    {bebidas.length > 0 && (
                      <PildoraResumen
                        servida={inicioBebidas === null}
                        texto={
                          inicioBebidas === null
                            ? "Bebida ✓"
                            : `Bebida ${formatearDuracion(ahora - inicioBebidas)}`
                        }
                      />
                    )}
                    {comidas.length > 0 && (
                      <PildoraResumen
                        servida={inicioComidas === null}
                        texto={
                          inicioComidas === null
                            ? "Comida ✓"
                            : `Comida ${formatearDuracion(ahora - inicioComidas)}`
                        }
                      />
                    )}
                  </div>
                ) : (
                  <Badge
                    semantic={mesa.ocupada ? "warning" : mesa.proximaReserva ? "highlight" : "success"}
                    className="mt-0.5"
                  >
                    {mesa.ocupada
                      ? "Ocupada"
                      : mesa.proximaReserva
                        ? `Reservada ${formatearHora(mesa.proximaReserva)}`
                        : "Libre"}
                  </Badge>
                ))}
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

        {guia && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {guia.lineaX !== undefined && (
              <line
                x1={guia.lineaX}
                y1={0}
                x2={guia.lineaX}
                y2={100}
                stroke="var(--color-brand)"
                strokeWidth={0.3}
                strokeDasharray="1.5,1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {guia.lineaY !== undefined && (
              <line
                x1={0}
                y1={guia.lineaY}
                x2={100}
                y2={guia.lineaY}
                stroke="var(--color-brand)"
                strokeWidth={0.3}
                strokeDasharray="1.5,1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {guia.espacioHorizontal && (
              <line
                x1={guia.espacioHorizontal.xIzq}
                y1={guia.espacioHorizontal.y}
                x2={guia.espacioHorizontal.xDer}
                y2={guia.espacioHorizontal.y}
                stroke="var(--color-info)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {guia.espacioVertical && (
              <line
                x1={guia.espacioVertical.x}
                y1={guia.espacioVertical.yArriba}
                x2={guia.espacioVertical.x}
                y2={guia.espacioVertical.yAbajo}
                stroke="var(--color-info)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}

        {editando &&
          zonaSeleccionada &&
          puntosSeleccionados.map((p, i) => (
            <span
              key={`${zonaSeleccionada.id}-esquina-${i}`}
              aria-hidden
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
            />
          ))}
        {editando &&
          zonaSeleccionada &&
          puntosSeleccionados.map((a, i) => {
            const b = puntosSeleccionados[(i + 1) % puntosSeleccionados.length];
            const horizontal = ladoEsHorizontal(a, b);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <span
                key={`${zonaSeleccionada.id}-lado-${i}`}
                onPointerDown={(e) => onAristaPointerDown(e, zonaSeleccionada.id, i)}
                onPointerMove={onAristaPointerMove}
                onPointerUp={onAristaPointerUp}
                onDoubleClick={() => onAristaDoubleClick(zonaSeleccionada.id, i)}
                style={{
                  left: `${mx}%`,
                  top: `${my}%`,
                  touchAction: "none",
                  cursor: horizontal ? "ns-resize" : "ew-resize",
                }}
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand border-2 border-bg"
                title="Arrastra para mover este lado, en ángulo recto. Doble toque para quitarlo."
              />
            );
          })}
        </div>

        {editando && (
          <span
            role="presentation"
            onPointerDown={onLienzoResizePointerDown}
            onPointerMove={onLienzoResizePointerMove}
            onPointerUp={onLienzoResizePointerUp}
            style={{ touchAction: "none" }}
            className="absolute bottom-1.5 right-1.5 z-10 h-4 w-4 cursor-ns-resize rounded-full border-2 border-bg bg-brand"
            title="Arrastra para cambiar el alto del plano."
          />
        )}
      </div>

      {editando && zonaSeleccionada && (
        <EstiloZonaPanel
          key={zonaSeleccionada.id}
          zona={zonaSeleccionada}
          color={colorZona[zonaSeleccionada.id] ?? zonaSeleccionada.color}
          numVertices={puntosDe(zonaSeleccionada.id).length}
          onCambiarColor={(c) => cambiarColorZona(zonaSeleccionada.id, c)}
          onAnadirVertice={() => anadirEsquina(zonaSeleccionada.id)}
          onRestablecerForma={() => restablecerFormaZona(zonaSeleccionada.id)}
          onAnadirMesa={() => anadirMesaEnZona(zonaSeleccionada.id)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
      {editando && mesasSeleccionadas.length === 1 && (
        <EstiloMesaPanel
          key={mesasSeleccionadas[0].id}
          mesa={mesasSeleccionadas[0]}
          estilo={estiloMesaActual(mesasSeleccionadas[0].id)}
          datos={datosMesaActual(mesasSeleccionadas[0].id)}
          error={erroresMesa[mesasSeleccionadas[0].id]}
          onCambiar={(next) => guardarEstiloMesa(mesasSeleccionadas[0].id, next)}
          onCambiarDatos={(next) => guardarDatosMesa(mesasSeleccionadas[0].id, next)}
          onCerrar={() => setSeleccion(null)}
        />
      )}
      {editando && mesasSeleccionadas.length > 1 && (
        <EstiloMesasMultiplePanel
          key={mesasSeleccionadasIds.join(",")}
          mesas={mesasSeleccionadas}
          onCambiarEstilo={(cambios) => guardarEstiloMesasMultiple(mesasSeleccionadasIds, cambios)}
          onCambiarCapacidad={(capacidad) => guardarCapacidadMesasMultiple(mesasSeleccionadasIds, capacidad)}
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

// Como Badge, pero sin su padding fijo — Badge no lo deja pisar de forma
// fiable pasando className (cn no fusiona utilidades de Tailwind en
// conflicto, solo las concatena) — para poder darle más tamaño del que
// Badge permite y que se lea bien de un vistazo sobre la mesa.
function PildoraResumen({ servida, texto }: { servida: boolean; texto: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-sm font-semibold leading-tight whitespace-nowrap ${
        servida ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
      }`}
    >
      {texto}
    </span>
  );
}

function EstiloZonaPanel({
  zona,
  color,
  numVertices,
  onCambiarColor,
  onAnadirVertice,
  onRestablecerForma,
  onAnadirMesa,
  onCerrar,
}: {
  zona: ZonaPlano;
  color: string;
  numVertices: number;
  onCambiarColor: (color: string) => void;
  onAnadirVertice: () => void;
  onRestablecerForma: () => void;
  onAnadirMesa: () => void;
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
      <Button type="button" variant="secondary" onClick={onAnadirMesa}>
        + Añadir mesa
      </Button>
      <Button type="button" variant="secondary" onClick={onAnadirVertice}>
        + Añadir esquina
      </Button>
      {numVertices > 4 && (
        <Button type="button" variant="ghost" onClick={onRestablecerForma}>
          Restablecer forma
        </Button>
      )}
      <p className="text-xs text-text-faint basis-full">
        {numVertices} puntos, siempre en ángulo recto. Arrastra el interior para mover toda la
        zona, o el borde de un lado para desplazarlo — doble toque en un lado interior lo quita.
        &quot;+ Añadir esquina&quot; mete una muesca en el lado más largo para convertir un
        rectángulo en una L, una U... &quot;Restablecer forma&quot; vuelve a un rectángulo simple
        sin mover la zona ni las mesas de dentro. La mesa nueva se numera sola — ajusta número,
        comensales, forma y tamaño seleccionándola.
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
  datos,
  error,
  onCambiar,
  onCambiarDatos,
  onCerrar,
}: {
  mesa: MesaPlano;
  estilo: EstiloMesa;
  datos: DatosMesa;
  error?: string;
  onCambiar: (next: EstiloMesa) => void;
  onCambiarDatos: (next: DatosMesa) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-end gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">Mesa {mesa.numero}</p>
      <Input
        label="Número"
        value={datos.numero}
        onChange={(e) => onCambiarDatos({ ...datos, numero: e.target.value })}
        className="w-28"
      />
      <Input
        label="Comensales"
        type="number"
        min={1}
        value={datos.capacidad}
        onChange={(e) => onCambiarDatos({ ...datos, capacidad: Number(e.target.value) })}
        className="w-28"
      />
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
      {error && <p className="text-xs text-danger basis-full">{error}</p>}
      <p className="text-xs text-text-faint basis-full">
        También puedes arrastrar el punto verde de la esquina de la mesa para cambiar el tamaño.
      </p>
      <Button type="button" variant="ghost" onClick={onCerrar}>
        Cerrar
      </Button>
    </div>
  );
}

// Panel de edición cuando hay varias mesas seleccionadas a la vez — el
// número no se puede compartir entre mesas (tiene que ser único por zona),
// así que solo se ofrecen forma, tamaño y comensales, aplicados a todas de
// golpe. Cada campo se deja vacío por defecto ("sin cambiar") y solo se
// aplica al perder el foco, para no lanzar una actualización por mesa en
// cada pulsación de tecla.
function EstiloMesasMultiplePanel({
  mesas,
  onCambiarEstilo,
  onCambiarCapacidad,
  onCerrar,
}: {
  mesas: MesaPlano[];
  onCambiarEstilo: (cambios: Partial<EstiloMesa>) => void;
  onCambiarCapacidad: (capacidad: number) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap items-end gap-4 sticky bottom-4">
      <p className="text-text font-medium basis-full">{mesas.length} mesas seleccionadas</p>
      <Select
        label="Forma"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onCambiarEstilo({ forma: e.target.value as "REDONDA" | "RECTANGULAR" });
        }}
        className="w-40"
      >
        <option value="">Sin cambiar</option>
        <option value="RECTANGULAR">Rectangular</option>
        <option value="REDONDA">Redonda</option>
      </Select>
      <Input
        label="Ancho (px)"
        type="number"
        min={MESA_MIN}
        max={MESA_MAX}
        placeholder="Sin cambiar"
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (e.target.value && Number.isFinite(v)) onCambiarEstilo({ ancho: v });
        }}
        className="w-28"
      />
      <Input
        label="Alto (px)"
        type="number"
        min={MESA_MIN}
        max={MESA_MAX}
        placeholder="Sin cambiar"
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (e.target.value && Number.isFinite(v)) onCambiarEstilo({ alto: v });
        }}
        className="w-28"
      />
      <Input
        label="Comensales"
        type="number"
        min={1}
        placeholder="Sin cambiar"
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (e.target.value && Number.isFinite(v) && v >= 1) onCambiarCapacidad(Math.round(v));
        }}
        className="w-28"
      />
      <p className="text-xs text-text-faint basis-full">
        Los cambios se aplican a las {mesas.length} mesas seleccionadas. Deja un campo en blanco
        para no tocarlo.
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

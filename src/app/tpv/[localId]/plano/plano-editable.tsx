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

export type Punto = { x: number; y: number };

function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

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
  const redimensionLienzo = useRef<{ startY: number; altoInicial: number } | null>(null);
  function puntosDe(zonaId: string): Punto[] {
    const zona = zonas.find((z) => z.id === zonaId);
    return puntosZona[zonaId] ?? zona?.puntos ?? [];
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
    const puntos = puntosDe(zonaId);
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
    const puntos = puntosDe(d.zonaId);
    startTransition(() => {
      actualizarPuntosZona(localId, d.zonaId, puntos);
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
    setColorZona((prev) => ({ ...prev, [zonaId]: color }));
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
  }

  function onMesaPointerUp(mesaId: string) {
    const d = arrastreMesa.current;
    arrastreMesa.current = null;
    setGuia(null);
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

  function anadirMesaEnZona(zonaId: string) {
    startTransition(() => {
      crearMesaEnZona(localId, zonaId);
    });
  }

  function guardarDatosMesa(mesaId: string, next: DatosMesa) {
    setDatosMesa((prev) => ({ ...prev, [mesaId]: next }));
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
    arrastreElemento.current = { id: elementoId, startX: e.clientX, startY: e.clientY, distancia: 0 };
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

    function campoEditable(destino: EventTarget | null) {
      if (!(destino instanceof HTMLElement)) return false;
      return destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.tagName === "SELECT";
    }

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
        const mesa = todasLasMesas.find((m) => m.id === seleccion.id);
        if (!mesa) return;
        const actual = posicionesMesa[mesa.id] ?? { x: mesa.posicionX, y: mesa.posicionY };
        const siguiente = {
          x: Math.min(98, Math.max(2, actual.x + dx)),
          y: Math.min(98, Math.max(2, actual.y + dy)),
        };
        setPosicionesMesa((prev) => ({ ...prev, [mesa.id]: siguiente }));
        startTransition(() => {
          moverMesa(localId, mesa.id, siguiente.x, siguiente.y);
        });
      } else if (seleccion.tipo === "elemento") {
        const el = elementos.find((el) => el.id === seleccion.id);
        if (!el) return;
        const actual = posicionesElemento[el.id] ?? { x: el.posicionX, y: el.posicionY };
        const siguiente = {
          x: Math.min(98, Math.max(2, actual.x + dx)),
          y: Math.min(98, Math.max(2, actual.y + dy)),
        };
        setPosicionesElemento((prev) => ({ ...prev, [el.id]: siguiente }));
        startTransition(() => {
          moverElemento(localId, el.id, siguiente.x, siguiente.y);
        });
      } else if (seleccion.tipo === "zona") {
        const actuales = puntosZona[seleccion.id] ?? zonas.find((z) => z.id === seleccion.id)?.puntos ?? [];
        const nuevos = actuales.map((p) => ({
          x: Math.min(98, Math.max(2, p.x + dx)),
          y: Math.min(98, Math.max(2, p.y + dy)),
        }));
        setPuntosZona((prev) => ({ ...prev, [seleccion.id]: nuevos }));
        startTransition(() => {
          actualizarPuntosZona(localId, seleccion.id, nuevos);
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editando, seleccion, todasLasMesas, elementos, zonas, posicionesMesa, posicionesElemento, puntosZona, localId]);

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

  const puntosSeleccionados = zonaSeleccionada ? puntosDe(zonaSeleccionada.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-text-muted">
          {editando
            ? "Arrastra el interior de una zona para moverla, o el borde de un lado para desplazarlo — siempre en ángulo recto. Doble toque en un lado interior lo quita. Con algo seleccionado, muévelo también con las flechas del teclado."
            : "Toca una mesa para abrir su comanda."}
        </p>
        <Button
          type="button"
          variant={editando ? "primary" : "secondary"}
          onClick={() => {
            setEditando((v) => !v);
            setSeleccion(null);
            setGuia(null);
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
        style={{ height: altoLienzo, maxHeight: "55vh" }}
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
              <span className="text-lg font-semibold text-text leading-none">{datos.numero}</span>
              <span className="text-xs text-text-faint leading-none">{datos.capacidad}p</span>
              {!editando && (
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
          datos={
            datosMesa[mesaSeleccionada.id] ?? {
              numero: mesaSeleccionada.numero,
              capacidad: mesaSeleccionada.capacidad,
            }
          }
          error={erroresMesa[mesaSeleccionada.id]}
          onCambiar={(next) => guardarEstiloMesa(mesaSeleccionada.id, next)}
          onCambiarDatos={(next) => guardarDatosMesa(mesaSeleccionada.id, next)}
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

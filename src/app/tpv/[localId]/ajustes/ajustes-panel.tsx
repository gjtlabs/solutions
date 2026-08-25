"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  NOMBRE_COLOR_MARCA,
  NOMBRE_TEMA,
  colorMuestra,
  type ColorMarca,
  type TemaColor,
} from "@/lib/apariencia";
import { actualizarFormatoPlano } from "../mesas/actions";
import { actualizarTema, actualizarColorMarca } from "./actions";

type FormatoPlano = "PANORAMICO_16_9" | "ESTANDAR_4_3";
const NOMBRE_FORMATO: Record<FormatoPlano, string> = {
  PANORAMICO_16_9: "16:9 panorámico",
  ESTANDAR_4_3: "4:3 estándar",
};
const COLORES_MARCA: ColorMarca[] = ["VERDE", "AZUL", "TERRACOTA", "GRANATE", "PIZARRA"];
const TEMAS: TemaColor[] = ["CLARO", "OSCURO"];

export function AjustesPanel({
  localId,
  planoFormato,
  tema,
  colorMarca,
}: {
  localId: string;
  planoFormato: FormatoPlano;
  tema: TemaColor;
  colorMarca: ColorMarca;
}) {
  const [, startTransition] = useTransition();
  const [formato, setFormato] = useState<FormatoPlano>(planoFormato);
  const [temaActual, setTemaActual] = useState<TemaColor>(tema);
  const [colorActual, setColorActual] = useState<ColorMarca>(colorMarca);

  function cambiarFormato(f: FormatoPlano) {
    setFormato(f);
    startTransition(() => {
      actualizarFormatoPlano(localId, f);
    });
  }

  function cambiarTema(t: TemaColor) {
    setTemaActual(t);
    startTransition(() => {
      actualizarTema(localId, t);
    });
  }

  function cambiarColor(c: ColorMarca) {
    setColorActual(c);
    startTransition(() => {
      actualizarColorMarca(localId, c);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardTitle>Formato de página</CardTitle>
        <p className="text-text-muted mb-4">
          El ancho de toda la pantalla — elige el que más se parezca al ordenador del TPV.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NOMBRE_FORMATO) as FormatoPlano[]).map((f) => (
            <Button
              key={f}
              type="button"
              variant={formato === f ? "primary" : "secondary"}
              onClick={() => cambiarFormato(f)}
            >
              {NOMBRE_FORMATO[f]}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Tema</CardTitle>
        <p className="text-text-muted mb-4">Claro u oscuro, solo para este local.</p>
        <div className="flex flex-wrap gap-2">
          {TEMAS.map((t) => (
            <Button
              key={t}
              type="button"
              variant={temaActual === t ? "primary" : "secondary"}
              onClick={() => cambiarTema(t)}
            >
              {NOMBRE_TEMA[t]}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Color de marca</CardTitle>
        <p className="text-text-muted mb-4">
          El color de los botones y los enlaces en todas las pantallas de este local.
        </p>
        <div className="flex flex-wrap gap-3">
          {COLORES_MARCA.map((c) => (
            <button
              key={c}
              type="button"
              title={NOMBRE_COLOR_MARCA[c]}
              onClick={() => cambiarColor(c)}
              style={{ background: colorMuestra(c) }}
              className={`h-9 w-9 rounded-full border-2 border-bg ${
                colorActual === c ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

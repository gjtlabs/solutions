"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { crearFilaAction, actualizarFilaAction, borrarFilaAction } from "./acciones";
import { formatoCelda } from "./formato";
import type { CampoTabla, FilaTabla, OpcionRelacion } from "./tipos";

// Los campos llegan sin cargarOpciones — una función no cruza la frontera
// servidor -> cliente, así que el server component ya resolvió las
// opciones de cada relación y las manda aparte, en opcionesPorCampo.
export type CampoCliente = Omit<CampoTabla, "cargarOpciones">;

type Valor = string | boolean;
type Valores = Record<string, Valor>;

function valorInicial(campo: CampoCliente, valor: unknown): Valor {
  if (campo.tipo === "booleano") return Boolean(valor);
  if (campo.tipo === "password") return "";
  if (campo.tipo === "fecha") {
    if (valor instanceof Date) {
      const sinZona = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
      return sinZona.toISOString().slice(0, 16);
    }
    return typeof valor === "string" ? valor : "";
  }
  if (campo.tipo === "json") return valor ? JSON.stringify(valor) : "";
  if (campo.tipo === "lista") return Array.isArray(valor) ? valor.join(", ") : "";
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

function valoresVacios(campos: CampoCliente[]): Valores {
  return Object.fromEntries(campos.map((c) => [c.clave, c.tipo === "booleano" ? false : ""]));
}

function CampoInput({
  campo,
  valor,
  onChange,
  opciones,
}: {
  campo: CampoCliente;
  valor: Valor;
  onChange: (v: Valor) => void;
  opciones?: OpcionRelacion[];
}) {
  switch (campo.tipo) {
    case "booleano":
      return (
        <input
          type="checkbox"
          checked={valor as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5"
        />
      );
    case "enum":
      return (
        <select
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 bg-surface border border-border rounded-sm px-2 text-text"
        >
          {(campo.opciones ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "relacion":
      return (
        <select
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 bg-surface border border-border rounded-sm px-2 text-text min-w-[10rem]"
        >
          <option value="">—</option>
          {(opciones ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      );
    case "numero":
    case "decimal":
      return (
        <input
          type="number"
          step={campo.tipo === "decimal" ? "0.0001" : "1"}
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      );
    case "fecha":
      return (
        <input
          type="datetime-local"
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          className="bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      );
    case "textoLargo":
    case "json":
      return (
        <textarea
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-48 bg-surface border border-border rounded-sm px-2 py-1 text-text text-sm font-mono"
        />
      );
    case "password":
      return (
        <input
          type="password"
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder="········"
          className="w-32 bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      );
    default:
      return (
        <input
          type="text"
          value={valor as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      );
  }
}

function FilaEditable({
  localId,
  slug,
  campos,
  fila,
  opcionesPorCampo,
  puedeEditar,
  puedeBorrar,
}: {
  localId: string;
  slug: string;
  campos: CampoCliente[];
  fila: FilaTabla;
  opcionesPorCampo: Record<string, OpcionRelacion[]>;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}) {
  const [, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>(() =>
    Object.fromEntries(campos.map((c) => [c.clave, valorInicial(c, fila[c.clave])])),
  );
  const [error, setError] = useState<string | null>(null);

  const cambiado = campos.some(
    (c) => !c.soloLectura && c.tipo !== "password" && valores[c.clave] !== valorInicial(c, fila[c.clave]),
  );
  const contrasenaNueva = typeof valores.password === "string" && valores.password !== "";

  function guardar() {
    startTransition(async () => {
      const resultado = await actualizarFilaAction(localId, slug, String(fila.id), valores);
      setError(resultado?.error ?? null);
    });
  }

  function borrar() {
    startTransition(async () => {
      const resultado = await borrarFilaAction(localId, slug, String(fila.id));
      setError(resultado?.error ?? null);
    });
  }

  return (
    <TableRow>
      {campos.map((c) => (
        <Td key={c.clave} compact>
          {c.tipo === "enlace" ? (
            fila[c.clave] ? (
              <Link href={String(fila[c.clave])} className="text-brand underline text-sm">
                Ver →
              </Link>
            ) : null
          ) : c.soloLectura || !puedeEditar ? (
            <span className="font-mono text-sm">{formatoCelda(fila[c.clave])}</span>
          ) : (
            <CampoInput
              campo={c}
              valor={valores[c.clave]}
              onChange={(v) => setValores((s) => ({ ...s, [c.clave]: v }))}
              opciones={opcionesPorCampo[c.clave]}
            />
          )}
        </Td>
      ))}
      {(puedeEditar || puedeBorrar) && (
        <Td compact>
          <div className="flex justify-end items-center gap-2">
            {error && <p className="text-sm text-danger">{error}</p>}
            {puedeEditar && (cambiado || contrasenaNueva) && (
              <Button type="button" variant="ghost" onClick={guardar}>
                Guardar
              </Button>
            )}
            {puedeBorrar && (
              <Button type="button" variant="ghost" onClick={borrar}>
                Borrar
              </Button>
            )}
          </div>
        </Td>
      )}
    </TableRow>
  );
}

function FormularioNuevo({
  localId,
  slug,
  campos,
  opcionesPorCampo,
  valoresPredefinidas,
}: {
  localId: string;
  slug: string;
  campos: CampoCliente[];
  opcionesPorCampo: Record<string, OpcionRelacion[]>;
  valoresPredefinidas?: Valores;
}) {
  const camposCreables = campos.filter((c) => !c.soloLectura);
  const [, startTransition] = useTransition();
  const [valores, setValores] = useState<Valores>(() => ({
    ...valoresVacios(camposCreables),
    ...valoresPredefinidas,
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function crear() {
    setPending(true);
    startTransition(async () => {
      const resultado = await crearFilaAction(localId, slug, valores);
      setPending(false);
      if (resultado?.error) {
        setError(resultado.error);
      } else {
        setError(null);
        setValores({ ...valoresVacios(camposCreables), ...valoresPredefinidas });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
      {camposCreables.map((c) => (
        <div key={c.clave} className="flex flex-col gap-1">
          <label className="text-xs text-text-faint">
            {c.etiqueta}
            {c.requerido ? " *" : ""}
          </label>
          <CampoInput
            campo={c}
            valor={valores[c.clave]}
            onChange={(v) => setValores((s) => ({ ...s, [c.clave]: v }))}
            opciones={opcionesPorCampo[c.clave]}
          />
        </div>
      ))}
      <Button type="button" onClick={crear} disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir fila"}
      </Button>
      {error && <p className="text-sm text-danger basis-full">{error}</p>}
    </div>
  );
}

export function TablaEditable({
  localId,
  slug,
  campos,
  filas,
  opcionesPorCampo,
  puedeCrear,
  puedeEditar,
  puedeBorrar,
  filtroRapido,
  valoresPredefinidas,
}: {
  localId: string;
  slug: string;
  campos: CampoCliente[];
  filas: FilaTabla[];
  opcionesPorCampo: Record<string, OpcionRelacion[]>;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  filtroRapido?: { clave: string; opciones: string[] };
  valoresPredefinidas?: Valores;
}) {
  const [valorFiltro, setValorFiltro] = useState<string | null>(null);
  const filasFiltradas =
    filtroRapido && valorFiltro ? filas.filter((f) => f[filtroRapido.clave] === valorFiltro) : filas;

  return (
    <div className="flex flex-col gap-4">
      {filtroRapido && filas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={valorFiltro === null ? "secondary" : "ghost"} size="normal" onClick={() => setValorFiltro(null)}>
            Todos ({filas.length})
          </Button>
          {filtroRapido.opciones.map((op) => {
            const total = filas.filter((f) => f[filtroRapido.clave] === op).length;
            return (
              <Button
                key={op}
                type="button"
                variant={valorFiltro === op ? "secondary" : "ghost"}
                size="normal"
                onClick={() => setValorFiltro(op)}
              >
                {op} ({total})
              </Button>
            );
          })}
        </div>
      )}
      {filasFiltradas.length === 0 ? (
        <p className="text-text-muted">
          {filas.length === 0 ? "Todavía no hay ninguna." : "Ninguna con este filtro."}
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {campos.map((c) => (
                <Th key={c.clave}>{c.etiqueta}</Th>
              ))}
              {(puedeEditar || puedeBorrar) && <Th />}
            </TableRow>
          </TableHead>
          <TableBody>
            {filasFiltradas.map((fila) => (
              <FilaEditable
                key={String(fila.id)}
                localId={localId}
                slug={slug}
                campos={campos}
                fila={fila}
                opcionesPorCampo={opcionesPorCampo}
                puedeEditar={puedeEditar}
                puedeBorrar={puedeBorrar}
              />
            ))}
          </TableBody>
        </Table>
      )}
      {puedeCrear && (
        <FormularioNuevo
          localId={localId}
          slug={slug}
          campos={campos}
          opcionesPorCampo={opcionesPorCampo}
          valoresPredefinidas={valoresPredefinidas}
        />
      )}
    </div>
  );
}

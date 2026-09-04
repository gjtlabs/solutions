# Componentes canónicos — Soluciones

Reglas de uso para cada componente reutilizable. Cuando el proyecto Next.js exista (Fase 0), cada uno de estos vive como un componente real en `src/components/ui/` (p. ej. `button.tsx`, `card.tsx`) — este archivo es la especificación a partir de la cual se implementan, y a la que se vuelve cuando haga falta una variante nueva.

Todos los ejemplos usan las clases de Tailwind ya mapeadas a los tokens de `tokens.md` (`bg-brand`, `text-text-muted`, etc.) — nunca un color hex suelto en el markup.

## Estados de interacción (aplican a todo lo de abajo)

- **Hover**: cambia `background`, nunca solo el texto — el usuario en tablet necesita ver claramente qué es tocable.
- **Focus visible**: `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg` en todo elemento interactivo. Es accesibilidad básica, no opcional — alguien navegando por teclado en el back-office lo necesita.
- **Disabled**: `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`. Nunca ocultar un control deshabilitado, mostrarlo apagado.

## Button

Cuatro variantes de color, dos tamaños.

| Variante   | Uso                                                        | Clases base |
|------------|-------------------------------------------------------------|-------------|
| `primary`  | La acción principal de la pantalla (una por vista, normalmente) | `bg-brand text-brand-on hover:bg-brand-hover` |
| `secondary`| Acciones alternativas, "Cancelar", exportar, etc.            | `bg-surface border border-border text-text hover:bg-surface-2` |
| `ghost`    | Acciones de bajo énfasis dentro de una card o fila de tabla  | `bg-transparent text-brand hover:bg-brand-subtle` |
| `danger`   | Eliminar, anular comanda, dar de baja                        | `bg-danger text-brand-on hover:bg-danger-hover` |

Tamaños:

- **Normal** (back-office, escritorio): `h-10 px-4 rounded-sm text-base font-medium`
- **Táctil** (TPV de sala — mesas, botones de comanda, cobrar): `h-16 px-6 rounded-sm text-lg font-medium` — objetivo de toque grande, nunca botones pequeños en pantallas que se usan de pie o con prisa.

No crear una quinta variante de color. Si una pantalla "necesita destacar más", es una señal de que hay dos acciones primarias compitiendo — resolver eso con jerarquía (una primary, el resto secondary/ghost), no con más color.

## Input / Select / Search field

```
bg-surface border border-border rounded-sm px-3 h-10 text-base text-text
placeholder:text-text-faint
focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand
```

- Label siempre visible encima del campo (`text-sm font-medium text-text-muted`), nunca solo placeholder — en un formulario de nómina o de recepción de proveedor el usuario necesita confirmar qué campo es cada uno de un vistazo.
- Error de validación: `border-danger` + texto de ayuda `text-sm text-danger` debajo del campo, nunca solo el borde en rojo sin explicación.
- Variante táctil (TPV, si hace falta un campo de búsqueda de producto en sala): `h-14 text-lg`.

## Card

```
bg-surface border border-border rounded-md p-6
```

- Sin sombra en reposo por defecto (el borde ya la separa del fondo `bg-bg`); usar `shadow-raised` solo si la card es interactiva y necesita indicar que "flota" al hover (p. ej. una card de producto clicable en el catálogo del escandallo).
- Título de card: `text-xl font-semibold text-text`, con `mb-4` antes del contenido.

## Table

Dos densidades, misma estructura:

```
thead: sticky top-0 bg-surface border-b border-border-strong
       th: text-xs uppercase tracking-wide text-text-faint font-medium text-left
tbody: tr: border-b border-border hover:bg-surface-2
       td: text-base text-text (o text-sm en densidad compacta)
```

- **Estándar** (`py-3` en celdas): back-office general — proveedores, recepciones, empleados.
- **Compacta** (`py-1.5` en celdas, `text-sm`): tablas con muchas filas y el usuario ya sabe leerlas rápido — inventario, movimientos de stock, líneas de nómina.
- Cualquier columna numérica (precio, cantidad, stock, importe) va en `font-mono tabular-nums text-right`. Las columnas de texto van a la izquierda. Nunca centrar contenido de tabla.

## Badge / StatusPill

```
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
```

Color según el semántico que le corresponda (ver tabla de mapeo en `tokens.md`):

- Success: `bg-success-bg text-success`
- Warning: `bg-warning-bg text-warning`
- Danger: `bg-danger-bg text-danger`
- Info: `bg-info-bg text-info`
- Neutral (p. ej. "cobrada", un estado terminal sin urgencia): `bg-surface-2 text-text-muted`

Nunca poner el badge en el color de marca (`brand`) — reservado para acciones, no para estados.

## Modal / Dialog

```
Overlay:  fixed inset-0 bg-text/40 (usa el token de texto oscuro como base del overlay, no negro puro)
Panel:    bg-surface rounded-md shadow-modal p-6 max-w-md w-full
```

- Botón de cerrar: `ghost`, icono, esquina superior derecha.
- Footer de acciones: alineado a la derecha, `secondary` (Cancelar) a la izquierda del `primary` (confirmar) — el orden importa, la acción que compromete va más a la derecha, más cerca de donde termina de leer el usuario.
- Confirmaciones destructivas (anular comanda, eliminar proveedor) usan botón `danger` en vez de `primary` en el footer.
- Implementación: `<Modal>` en `src/components/ui/modal.tsx` — cierra con `router.back()` (clic en el overlay, Escape o el botón ✕), así que solo tiene sentido montado desde una ruta interceptada (`(.)ruta`, ver `app/tpv/[localId]/@mesaModal`), nunca desde un `useState` suelto de "abierto/cerrado". El contenido se pasa como `children` para que siga siendo Server Component (ver la mesa del plano: tocar una mesa abre su comanda en este modal sin salir del plano, y la misma ruta a pantalla completa sigue funcionando por URL directa o recarga).

## Sidebar de navegación + Tabs

**Sidebar** (back-office, navegación entre módulos):

```
bg-surface border-r border-border
item:        text-text-muted hover:bg-surface-2 rounded-sm px-3 h-10 flex items-center gap-2
item activo: bg-brand-subtle text-brand font-medium border-l-2 border-brand
```

**Tabs** (subsecciones dentro de un módulo, p. ej. dentro de Inventario: "Stock" / "Movimientos" / "Alertas"):

```
tab:        text-text-muted border-b-2 border-transparent hover:text-text px-1 pb-2
tab activo: text-text border-b-2 border-brand font-medium
```

No mezclar sidebar y tabs para el mismo nivel de navegación — sidebar es para los módulos de primer nivel (TPV, Ventas, Carta, Inventario, Proveedores, Escandallo, Gestoría), tabs son para subsecciones dentro de un módulo.

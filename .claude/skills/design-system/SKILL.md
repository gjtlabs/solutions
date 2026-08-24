---
name: design-system
description: Sistema de diseño de la app "Soluciones" (TPV y back-office para bares, Next.js + Tailwind). Consulta esta skill SIEMPRE que vayas a crear o modificar cualquier pantalla, página o componente de UI de Soluciones — TPV de sala, carta, inventario, proveedores, escandallo o gestoría — incluso si el usuario no menciona explícitamente "diseño" o "estilo". También aplica al arrancar el proyecto Next.js (Fase 0), al tocar tailwind.config, globals.css, o cualquier archivo bajo src/components/ui/. No aplica a Artifacts de chat (para eso usa la skill artifact-design) ni a documentos de arquitectura/planificación.
---

# Sistema de diseño — Soluciones

Soluciones es una app de trabajo diario: TPV en tablet de sala y back-office de escritorio (inventario, proveedores, escandallo, gestoría). El objetivo del diseño es que cualquier pantalla nueva sea indistinguible en estilo de las que ya existen — mismos botones, mismos inputs, misma paleta, mismo espaciado — sin que cada sección se sienta diseñada por separado.

## Principios

1. **Un único acento de marca.** El verde botella (`--color-brand`) es el único color con carga "de marca" — botones primarios, enlaces, elementos activos. No se usa para decorar ni para dar variedad visual a una pantalla; si algo necesita destacar por estado (éxito, aviso, error), se usa un color semántico, nunca el acento de marca.
2. **Reutilizar antes que crear.** Antes de escribir el markup de un botón, tabla, badge o modal nuevo, comprueba si ya existe en `src/components/ui/` (una vez arrancado el proyecto) o revisa `references/components.md` de esta skill. Si el componente que necesitas ya está descrito ahí, úsalo tal cual — no generes una variante ad hoc con clases de Tailwind sueltas.
3. **Minimalista no significa vacío.** Espaciado generoso, poco ruido visual, jerarquía clara por tipografía y peso, no por color. La elegancia viene de la consistencia, no de añadir adornos.
4. **Sala vs. escritorio son densidades distintas, no estilos distintos.** El TPV de sala usa los mismos tokens que el back-office, pero con la variante "táctil" de tamaño (ver `references/components.md`): objetivos de toque más grandes, texto más grande, porque se usa con el dedo y a veces con luz de bar. El back-office (inventario, gestoría) puede usar la densidad "compacta" en tablas porque se usa con ratón/teclado y muestra más datos por pantalla.
5. **Los números se alinean.** Cualquier cifra que aparezca en columna (precios, cantidades, stock, importes de nómina) usa la familia monoespaciada y `font-variant-numeric: tabular-nums`, nunca la fuente de interfaz normal.

## Dónde está cada cosa

- **`references/tokens.md`** — la paleta completa (modo claro y oscuro), tipografía, escala de espaciado, radios y sombras, ya en formato CSS custom properties + configuración de Tailwind. Cuando arranque el proyecto Next.js (Fase 0), estos bloques se copian tal cual a `globals.css` y `tailwind.config.ts`. Consúltalo antes de escribir cualquier valor de color, tamaño de texto, padding o radio a mano — no inventes un hex o un `px` nuevo, todo sale de esta tabla.
- **`references/components.md`** — reglas de uso y ejemplos de markup/Tailwind para cada componente canónico (Button, Input/Select, Card, Table, Badge/StatusPill, Modal, Sidebar/Tabs) y para los estados de interacción (hover, focus visible, disabled). Consúltalo antes de construir cualquier pantalla nueva.

## Flujo al construir una pantalla nueva

1. Identifica qué componentes canónicos necesita la pantalla (¿tabla?, ¿formulario?, ¿badges de estado?) y revisa sus reglas en `references/components.md`.
2. Si la pantalla es de sala (TPV), usa la variante táctil de botones/inputs. Si es de back-office, usa la densidad estándar o compacta.
3. Si necesitas un badge de estado que no esté ya mapeado en `references/components.md` (por ejemplo, un estado nuevo de un módulo futuro), elige el color semántico por significado (éxito/aviso/error/info), no por gusto, y añádelo a la tabla de mapeo del archivo para que quede documentado para la próxima vez.
4. Si algo no está cubierto por esta skill (un patrón de layout muy específico, un gráfico, una interacción nueva), resuélvelo con el mismo criterio — reutilizar tokens y principios — y considera si merece añadirse como componente canónico nuevo en `references/components.md` en lugar de quedar como un caso suelto.

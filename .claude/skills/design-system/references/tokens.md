# Tokens — Soluciones

Fuente de verdad para color, tipografía, espaciado, radios y sombra. Todo lo de este archivo se copia directamente a `globals.css` (custom properties) y `tailwind.config.ts` (theme.extend) en cuanto arranque el proyecto Next.js. No se redondean ni se improvisan valores fuera de esta tabla.

## Color

Neutrales con sesgo cálido (no gris puro) — evocan papel/madera de un bar, no una interfaz genérica. El acento de marca es verde botella. Los cuatro semánticos son deliberadamente distintos del verde de marca para que un botón "Guardar" nunca se confunda visualmente con un badge de "completado".

### Modo claro (`:root`)

```css
:root {
  /* Neutrales */
  --color-bg:            #FAF9F6;
  --color-surface:       #F3F1EC;
  --color-surface-2:     #EAE7DF;
  --color-border:        #DEDAD0;
  --color-border-strong: #C9C3B4;
  --color-text:          #211F1B;
  --color-text-muted:    #5C574C;
  --color-text-faint:    #8B8577;

  /* Marca — verde botella */
  --color-brand:         #3F5D46;
  --color-brand-hover:   #2E4634;
  --color-brand-subtle:  #E4EAE1;
  --color-brand-on:      #FFFFFF; /* texto/iconos sobre fondo de marca */

  /* Semánticos */
  --color-success:       #1F7A6C;
  --color-success-bg:    #E1F2EE;
  --color-warning:       #B8791A;
  --color-warning-bg:    #FBEEDA;
  --color-danger:        #B23B2E;
  --color-danger-hover:  #94301F;
  --color-danger-bg:     #F8E4E0;
  --color-info:          #2D628C;
  --color-info-bg:       #E1EBF3;

  /* Sombra (RGB base para usar con alpha) */
  --shadow-color: 23 20 15;

  /* Paleta de color de zonas del plano — deliberadamente sin verdes (ya
     ocupado por marca y éxito). Cada una es un par fill/borde. */
  --zona-azul-fill:      #DCE6EE;
  --zona-azul-borde:     #7FA0B8;
  --zona-ocre-fill:      #F0E6CC;
  --zona-ocre-borde:     #B89552;
  --zona-terracota-fill: #F0DAD2;
  --zona-terracota-borde:#C17A5E;
  --zona-malva-fill:     #E8DEEA;
  --zona-malva-borde:    #A683AD;
  --zona-pizarra-fill:   #DEE2E6;
  --zona-pizarra-borde:  #7C8894;
}
```

### Modo oscuro (`prefers-color-scheme: dark`, o `[data-theme="dark"]`)

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* bloque idéntico al de abajo */ }
}
:root[data-theme="dark"] {
  --color-bg:            #1A1815;
  --color-surface:       #211F1B;
  --color-surface-2:     #2A2822;
  --color-border:        #38352D;
  --color-border-strong: #4A4638;
  --color-text:          #F2EFE8;
  --color-text-muted:    #B8B2A0;
  --color-text-faint:    #857F6E;

  --color-brand:         #7FA687;
  --color-brand-hover:   #96BA9C;
  --color-brand-subtle:  #253226;
  --color-brand-on:      #14231A;

  --color-success:       #4FBBA6;
  --color-success-bg:    #1B3330;
  --color-warning:       #E0A94A;
  --color-warning-bg:    #3A2E17;
  --color-danger:        #E08776;
  --color-danger-hover:  #EDA394;
  --color-danger-bg:     #3A2119;
  --color-info:          #6FA0C7;
  --color-info-bg:       #1E2C3A;

  --shadow-color: 0 0 0;

  --zona-azul-fill:      #22303A;
  --zona-azul-borde:     #6E93AC;
  --zona-ocre-fill:      #362E1D;
  --zona-ocre-borde:     #C9A75E;
  --zona-terracota-fill: #33241E;
  --zona-terracota-borde:#C98567;
  --zona-malva-fill:     #2C2530;
  --zona-malva-borde:    #B48EBC;
  --zona-pizarra-fill:   #262B30;
  --zona-pizarra-borde:  #8C97A2;
}
```

> Duplica el bloque `:root[data-theme="dark"]` dentro del `@media (prefers-color-scheme: dark)` guardado como `:root:not([data-theme="light"])`, para que el modo oscuro del sistema operativo funcione sin que el usuario tenga que elegir nada, y el toggle manual (si se añade) siga ganando en ambas direcciones.

### Mapeo semántico → estado de negocio

No inventar un color nuevo por módulo: todo estado del producto cae en una de estas cuatro categorías.

| Estado                          | Semántico  |
|----------------------------------|------------|
| Comanda: pendiente               | warning    |
| Comanda: en cocina                | info       |
| Comanda: servida                  | success    |
| Comanda: cobrada                  | neutral (`surface-2` + `text-muted`, no lleva color semántico) |
| Stock: bajo mínimo                | warning    |
| Stock: agotado                    | danger     |
| Recepción: con incidencia         | danger     |
| Recepción: completa               | success    |
| Nómina: pendiente                 | warning    |
| Nómina: pagada                    | success    |
| Mesa: libre                       | neutral    |
| Mesa: ocupada                     | info       |

### Color de zonas del plano

Paleta aparte, solo para diferenciar visualmente las zonas del plano de sala (Barra, Terraza, Altillo...) entre sí — no tiene significado de estado, así que nunca se reutiliza fuera del plano ni se mezcla con los semánticos de arriba. Deliberadamente sin ningún tono verde: la marca y "éxito" ya ocupan ese hueco, un verde más en la lista confundiría.

| Token       | Uso                                    |
|-------------|------------------------------------------|
| `neutro`    | por defecto — usa `surface`/`border-strong`, sin tinte |
| `azul`      | `--zona-azul-fill` / `--zona-azul-borde` |
| `ocre`      | `--zona-ocre-fill` / `--zona-ocre-borde` |
| `terracota` | `--zona-terracota-fill` / `--zona-terracota-borde` |
| `malva`     | `--zona-malva-fill` / `--zona-malva-borde` |
| `pizarra`   | `--zona-pizarra-fill` / `--zona-pizarra-borde` |

Cada zona guarda el nombre del token (`"azul"`, no un hex) — el color real vive solo aquí, así que cambiarlo no toca datos.

## Tipografía

Dos familias, ninguna más:

- **Interfaz** (texto, botones, labels, títulos): `Inter` — grotesk neutro, muy legible en pantalla pequeña y en tablet. `font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
- **Datos numéricos** (precios, cantidades, stock, importes de nómina, horas de fichaje): `IBM Plex Mono`, con `font-variant-numeric: tabular-nums;` para que los dígitos alineen en columna. `font-family: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;`

### Escala (fija — no usar valores sueltos de `px`/`rem`)

| Token         | Tamaño   | Line-height | Uso                                      |
|---------------|----------|-------------|-------------------------------------------|
| `--text-xs`   | 0.75rem  | 1rem        | badges, captions, metadatos                |
| `--text-sm`   | 0.875rem | 1.25rem     | texto secundario, celdas de tabla compactas |
| `--text-base` | 1rem     | 1.5rem      | cuerpo por defecto, celdas de tabla estándar|
| `--text-lg`   | 1.125rem | 1.6rem      | subtítulo de sección, texto de botón táctil |
| `--text-xl`   | 1.375rem | 1.75rem     | título de card, cabecera de sección         |
| `--text-2xl`  | 1.75rem  | 2rem        | título de página                            |
| `--text-3xl`  | 2.25rem  | 2.5rem      | cifra destacada de dashboard (uso raro)     |

En pantallas de TPV, el cuerpo de texto nunca baja de `--text-base` (16px) y los botones usan `--text-lg`: se leen de pie, a veces con poca luz.

## Espaciado

Base 4px. Usar directamente la escala de espaciado por defecto de Tailwind (`1`=4px … coincide 1:1), no una escala custom:

| Token | px  | Tailwind |
|-------|-----|----------|
| space-1 | 4px  | `1`  |
| space-2 | 8px  | `2`  |
| space-3 | 12px | `3`  |
| space-4 | 16px | `4`  |
| space-6 | 24px | `6`  |
| space-8 | 32px | `8`  |
| space-12| 48px | `12` |
| space-16| 64px | `16` |

## Radio de borde

Solo dos valores. No usar `rounded-xl`, `rounded-2xl` ni radios sueltos.

| Token | px | Uso |
|-------|-----|-----|
| `--radius-sm` | 6px | botones, inputs, badges rectangulares |
| `--radius-md` | 12px | cards, modales, popovers |
| `--radius-full` | 999px | badges/pills redondeadas, avatar |

## Sombra / elevación

Tres niveles, nada más. El diseño es minimalista: la mayoría de superficies se distinguen por `border` + cambio de `background`, no por sombra. La sombra se reserva para lo que realmente flota sobre el contenido.

```css
--shadow-rest:   0 1px 2px rgb(var(--shadow-color) / 0.06);   /* card en reposo, opcional */
--shadow-raised: 0 4px 12px rgb(var(--shadow-color) / 0.10);  /* dropdown, card en hover */
--shadow-modal:  0 16px 40px rgb(var(--shadow-color) / 0.18); /* modal / dialog */
```

## `tailwind.config.ts` (Fase 0 — copiar tal cual)

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-faint": "var(--color-text-faint)",
        brand: {
          DEFAULT: "var(--color-brand)",
          hover: "var(--color-brand-hover)",
          subtle: "var(--color-brand-subtle)",
          on: "var(--color-brand-on)",
        },
        success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
        warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
        danger: {
          DEFAULT: "var(--color-danger)",
          hover: "var(--color-danger-hover)",
          bg: "var(--color-danger-bg)",
        },
        info: { DEFAULT: "var(--color-info)", bg: "var(--color-info-bg)" },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        rest: "var(--shadow-rest)",
        raised: "var(--shadow-raised)",
        modal: "var(--shadow-modal)",
      },
    },
  },
} satisfies Config;
```

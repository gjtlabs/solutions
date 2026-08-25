// Paleta de acento de marca para Ajustes — igual que los colores de zona
// del plano, una lista cerrada de tokens (nunca un hex libre elegido por
// el usuario) para que cualquier combinación siga leyéndose "Soluciones".
// Cada color trae su propio par claro/oscuro, calculados con el mismo
// criterio que el verde por defecto en tokens.md.

export type ColorMarca = "VERDE" | "AZUL" | "TERRACOTA" | "GRANATE" | "PIZARRA";
export type TemaColor = "CLARO" | "OSCURO";

type Paleta = { brand: string; hover: string; subtle: string; on: string };

const PALETA_MARCA: Record<ColorMarca, { claro: Paleta; oscuro: Paleta }> = {
  VERDE: {
    claro: { brand: "#3F5D46", hover: "#2E4634", subtle: "#E4EAE1", on: "#FFFFFF" },
    oscuro: { brand: "#7FA687", hover: "#96BA9C", subtle: "#253226", on: "#14231A" },
  },
  AZUL: {
    claro: { brand: "#2D4F6B", hover: "#203A4F", subtle: "#DCE6EE", on: "#FFFFFF" },
    oscuro: { brand: "#7FA0B8", hover: "#93B4C7", subtle: "#22303A", on: "#12202A" },
  },
  TERRACOTA: {
    claro: { brand: "#A85A3D", hover: "#8A4830", subtle: "#F0DAD2", on: "#FFFFFF" },
    oscuro: { brand: "#C98567", hover: "#D69C81", subtle: "#33241E", on: "#241712" },
  },
  GRANATE: {
    claro: { brand: "#7A2E3A", hover: "#5E232C", subtle: "#F2DEE1", on: "#FFFFFF" },
    oscuro: { brand: "#C97C8A", hover: "#D89AA5", subtle: "#332128", on: "#241318" },
  },
  PIZARRA: {
    claro: { brand: "#4A5560", hover: "#383F48", subtle: "#E3E6E8", on: "#FFFFFF" },
    oscuro: { brand: "#8C97A2", hover: "#A3ACB5", subtle: "#262B30", on: "#14181B" },
  },
};

export const NOMBRE_COLOR_MARCA: Record<ColorMarca, string> = {
  VERDE: "Verde botella",
  AZUL: "Azul marino",
  TERRACOTA: "Terracota",
  GRANATE: "Granate",
  PIZARRA: "Pizarra",
};

export const NOMBRE_TEMA: Record<TemaColor, string> = {
  CLARO: "Claro",
  OSCURO: "Oscuro",
};

// Un color de muestra representativo (el "brand" del par claro) para
// pintar cada swatch en Ajustes, sea cual sea el tema activo en ese
// momento.
export function colorMuestra(color: ColorMarca): string {
  return PALETA_MARCA[color].claro.brand;
}

// Variables CSS que sobrescriben el acento de marca para todo lo que hay
// dentro del contenedor donde se apliquen — botones, enlaces, focus ring.
export function estiloColorMarca(color: ColorMarca, tema: TemaColor): Record<string, string> {
  const paleta = PALETA_MARCA[color][tema === "OSCURO" ? "oscuro" : "claro"];
  return {
    "--color-brand": paleta.brand,
    "--color-brand-hover": paleta.hover,
    "--color-brand-subtle": paleta.subtle,
    "--color-brand-on": paleta.on,
  };
}

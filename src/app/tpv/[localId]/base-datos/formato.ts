// Una tabla genérica no sabe de antemano qué tipo trae cada columna — solo
// lo que Prisma ya devolvió (Date, boolean, array, número o string). Esto
// decide cómo se ve cada uno en la celda, en vez de imprimir [object Object].
export function formatoCelda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (valor instanceof Date) {
    return valor.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";
    return valor.every((v) => typeof v !== "object") ? valor.join(", ") : JSON.stringify(valor);
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

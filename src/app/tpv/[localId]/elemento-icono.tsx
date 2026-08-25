export type TipoElemento = "PUERTA" | "ESCALERA" | "PARED";

export const NOMBRE_ELEMENTO: Record<TipoElemento, string> = {
  PUERTA: "Puerta",
  ESCALERA: "Escalera",
  PARED: "Pared",
};

// Símbolos sencillos tipo "plano de arquitecto" — solo trazo, sin color de
// marca ni semántico (son elementos estructurales, no estados de negocio).
export function ElementoIcono({ tipo }: { tipo: TipoElemento }) {
  if (tipo === "PARED") {
    // La pared no lleva icono: es la propia barra sólida quien la representa.
    return null;
  }

  if (tipo === "PUERTA") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full text-text-faint" fill="none">
        <line x1="4" y1="96" x2="4" y2="8" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M4,8 A88,88 0 0 1 92,96" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="4" y1="96" x2="92" y2="96" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
      </svg>
    );
  }

  // ESCALERA — peldaños + flecha indicando que sube
  return (
    <svg viewBox="0 0 60 100" className="h-full w-full text-text-faint" fill="none">
      {[10, 25, 40, 55, 70, 85].map((y) => (
        <line key={y} x1="5" y1={y} x2="55" y2={y} stroke="currentColor" strokeWidth="3" />
      ))}
      <path
        d="M30,90 L30,10 M22,20 L30,8 L38,20"
        stroke="var(--color-brand)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

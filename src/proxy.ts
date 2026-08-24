import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Primera línea de defensa: aleja de las rutas protegidas a quien no tiene
// sesión. No es la única comprobación — cada Server Action y Route Handler
// vuelve a verificar la sesión por su cuenta (ver src/lib/session.ts), como
// recomienda Next.js, porque las Server Functions no pasan siempre por aquí.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Cada Server Component, Server Action o Route Handler que necesite una
// sesión llama a esto directamente en vez de confiar solo en proxy.ts — las
// Server Functions no siempre pasan por el proxy (ver nota en proxy.ts).
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Hola, {session.user.name}
          </h1>
          <p className="text-text-muted">{session.user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <Card>
        <CardTitle>Tus locales</CardTitle>
        {session.user.membresias.length === 0 ? (
          <p className="text-text-muted">
            Todavía no tienes ningún local asignado.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {session.user.membresias.map((m) => (
              <li
                key={m.localId}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text">{m.localNombre}</span>
                  <Badge semantic="info">{m.rol}</Badge>
                </div>
                <Link href={`/tpv/${m.localId}`}>
                  <Button variant="secondary">Abrir TPV</Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}

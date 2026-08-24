import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardTitle>Soluciones</CardTitle>
        <p className="text-sm text-text-muted mb-6">
          Entra con tu cuenta para gestionar tu local.
        </p>
        <LoginForm />
      </Card>
    </main>
  );
}

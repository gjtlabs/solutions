"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state?.error}
        required
      />
      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

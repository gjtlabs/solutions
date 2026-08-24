"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    // Los redirects de Next.js también pasan por aquí como error interno —
    // hay que dejarlos seguir su curso, no son un fallo de login.
    throw error;
  }
}

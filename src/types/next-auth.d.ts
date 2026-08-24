import type { DefaultSession } from "next-auth";
import type { Membresia } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      membresias: Membresia[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    membresias?: Membresia[];
  }
}

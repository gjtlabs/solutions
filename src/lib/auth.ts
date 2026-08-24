import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { Rol } from "@/generated/prisma/enums";

export type Membresia = { localId: string; localNombre: string; rol: Rol };

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { membresias: { include: { local: true } } },
        });
        if (!usuario) return null;

        const validPassword = await verifyPassword(password, usuario.passwordHash);
        if (!validPassword) return null;

        const membresias: Membresia[] = usuario.membresias.map((m) => ({
          localId: m.localId,
          localNombre: m.local.nombre,
          rol: m.rol,
        }));

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          membresias,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.membresias = (user as { membresias: Membresia[] }).membresias;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.membresias = (token.membresias as Membresia[]) ?? [];
      }
      return session;
    },
  },
});

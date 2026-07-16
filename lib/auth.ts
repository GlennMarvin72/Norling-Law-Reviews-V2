import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  pages: { signIn: "/signin" },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Provision the user record on first sign-in. Anniversary date and
      // targets get set by an admin afterwards.
      const isAdmin = adminEmails.includes(email);
      await db.user.upsert({
        where: { email },
        update: { name: user.name ?? email, role: isAdmin ? "ADMIN" : undefined },
        create: {
          email,
          name: user.name ?? email,
          role: isAdmin ? "ADMIN" : "STAFF",
          startDate: new Date(), // placeholder - admin sets the real anniversary
        },
      });
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const u = await db.user.findUnique({
          where: { email: token.email.toLowerCase() },
          select: { id: true, role: true },
        });
        if (u) {
          token.userId = u.id;
          token.role = u.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).userId = token.userId;
      (session as any).role = token.role;
      return session;
    },
  },
};

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHENTICATED");
  return session as typeof session & { userId: string; role: "STAFF" | "ADMIN" };
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") throw new Error("FORBIDDEN");
  return session;
}

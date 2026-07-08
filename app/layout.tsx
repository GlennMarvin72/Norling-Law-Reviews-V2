import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Norling Law Reviews",
  description: "Annual review reflections and performance packs",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = (await getServerSession(authOptions)) as any;
  const isAdmin = session?.role === "ADMIN";
  return (
    <html lang="en">
      <body>
        <header className="bg-ink text-white">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              norling law<span className="text-gold">.</span>
              <span className="ml-3 text-sm font-normal text-greymid">reviews</span>
            </Link>
            {session && (
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="hover:text-gold">Home</Link>
                {isAdmin && (
                  <>
                    <Link href="/admin/staff" className="hover:text-gold">Staff</Link>
                    <Link href="/admin/data" className="hover:text-gold">Data</Link>
                    <Link href="/admin/questions" className="hover:text-gold">Questions</Link>
                  </>
                )}
                <span className="text-greymid">{session.user?.name}</span>
              </nav>
            )}
          </div>
          <div className="h-1 bg-gold" />
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}

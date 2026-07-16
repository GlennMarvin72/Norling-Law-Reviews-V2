import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  const user = await db.user.create({
    data: {
      email: b.email.toLowerCase().trim(),
      name: b.name,
      position: b.position || null,
      startDate: new Date(b.startDate),
      hasTargets: !!b.hasTargets,
      role: b.role === "ADMIN" ? "ADMIN" : "STAFF",
    },
  });
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  const b = await req.json();

  // Role changes get guardrails: no demoting yourself, no removing the last admin
  if (b.role === "STAFF") {
    if (b.id === (session as any).userId) {
      return NextResponse.json(
        { error: "You can't remove your own admin rights - ask another admin to do it." },
        { status: 400 }
      );
    }
    const target = await db.user.findUnique({ where: { id: b.id } });
    if (target?.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "That would leave no admins - promote someone else first." },
          { status: 400 }
        );
      }
    }
  }

  const data: any = {};
  for (const k of ["name", "position", "active", "hasTargets", "reviewNotifications", "scheduler"]) if (k in b) data[k] = b[k];
  if (b.email) {
    const email = String(b.email).toLowerCase().trim();
    const clash = await db.user.findUnique({ where: { email } });
    if (clash && clash.id !== b.id) {
      return NextResponse.json(
        { error: `That email already belongs to ${clash.name} - emails must be unique.` },
        { status: 400 }
      );
    }
    data.email = email;
  }
  if (b.startDate) data.startDate = new Date(b.startDate);
  if (b.role) data.role = b.role;
  for (const k of ["salary", "billableTarget", "billableActual", "revenueTarget", "revenueActual"])
    if (k in b) data[k] = b[k] === "" || b[k] == null ? null : Number(b[k]);
  if ("dataPeriod" in b) data.dataPeriod = b.dataPeriod || null;
  const user = await db.user.update({ where: { id: b.id }, data });
  return NextResponse.json({ user });
}

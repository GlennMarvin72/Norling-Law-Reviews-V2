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
  await requireAdmin();
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "position", "active", "hasTargets"]) if (k in b) data[k] = b[k];
  if (b.startDate) data.startDate = new Date(b.startDate);
  if (b.role) data.role = b.role;
  for (const k of ["salary", "billableTarget", "billableActual", "revenueTarget", "revenueActual"])
    if (k in b) data[k] = b[k] === "" || b[k] == null ? null : Number(b[k]);
  if ("dataPeriod" in b) data.dataPeriod = b.dataPeriod || null;
  const user = await db.user.update({ where: { id: b.id }, data });
  return NextResponse.json({ user });
}

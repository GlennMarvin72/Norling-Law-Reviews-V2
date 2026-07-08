import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const sections = await db.section.findMany({
    orderBy: { order: "asc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ sections });
}

// POST { kind: "section"|"question", ...fields }
export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  if (b.kind === "section") {
    const max = await db.section.aggregate({ _max: { order: true } });
    const section = await db.section.create({
      data: { title: b.title, intro: b.intro || null, order: (max._max.order ?? 0) + 1 },
    });
    return NextResponse.json({ section });
  }
  const max = await db.question.aggregate({
    where: { sectionId: b.sectionId },
    _max: { order: true },
  });
  const question = await db.question.create({
    data: {
      sectionId: b.sectionId,
      type: b.type === "VALUE" ? "VALUE" : "LONGTEXT",
      label: b.label,
      helpText: b.helpText || null,
      requiresTargets: !!b.requiresTargets,
      order: (max._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ question });
}

// PUT { kind, id, ...fields } - includes order changes for re-sequencing
export async function PUT(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  if (b.kind === "section") {
    const data: any = {};
    for (const k of ["title", "intro", "order", "active"]) if (k in b) data[k] = b[k];
    const section = await db.section.update({ where: { id: b.id }, data });
    return NextResponse.json({ section });
  }
  const data: any = {};
  for (const k of ["label", "helpText", "order", "active", "requiresTargets", "type"])
    if (k in b) data[k] = b[k];
  const question = await db.question.update({ where: { id: b.id }, data });
  return NextResponse.json({ question });
}

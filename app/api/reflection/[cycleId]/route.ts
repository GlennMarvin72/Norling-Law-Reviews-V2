// FILE 2 of 3 - paste into: app/api/reflection/[cycleId]/route.ts  (the API - inside app/api/reflection, NOT the booked subfolder)
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAdminSubmitted } from "@/lib/email";

export const dynamic = "force-dynamic";

async function loadCycleForOwner(cycleId: string, userId: string) {
  const cycle = await db.reviewCycle.findUnique({
    where: { id: cycleId },
    include: { user: true },
  });
  if (!cycle || cycle.userId !== userId) return null;
  return cycle;
}

// GET - form structure (sections + questions filtered by hasTargets) plus saved answers
export async function GET(_req: NextRequest, { params }: { params: { cycleId: string } }) {
  const session = await requireSession();
  const cycle = await loadCycleForOwner(params.cycleId, session.userId);
  if (!cycle) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sections = await db.section.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      questions: {
        where: {
          active: true,
          ...(cycle.user.hasTargets ? {} : { requiresTargets: false }),
        },
        orderBy: { order: "asc" },
      },
    },
  });
  const answers = await db.answer.findMany({ where: { cycleId: cycle.id } });
  return NextResponse.json({
    status: cycle.status,
    reviewDate: cycle.reviewDate,
    sections,
    answers,
  });
}

// PUT - save draft answers { answers: [{questionId, selfRating, selfText, selfFocus}] }
export async function PUT(req: NextRequest, { params }: { params: { cycleId: string } }) {
  const session = await requireSession();
  const cycle = await loadCycleForOwner(params.cycleId, session.userId);
  if (!cycle) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cycle.status === "SUBMITTED" || cycle.status === "COMPLETED") {
    return NextResponse.json({ error: "locked" }, { status: 400 });
  }

  const body = await req.json();
  const cap = (v?: string | null) => (typeof v === "string" ? v.slice(0, 300) : null);
  for (const a of body.answers ?? []) {
    await db.answer.upsert({
      where: { cycleId_questionId: { cycleId: cycle.id, questionId: a.questionId } },
      update: { selfRating: a.selfRating ?? null, selfText: cap(a.selfText), selfFocus: cap(a.selfFocus) },
      create: {
        cycleId: cycle.id,
        questionId: a.questionId,
        selfRating: a.selfRating ?? null,
        selfText: cap(a.selfText),
        selfFocus: cap(a.selfFocus),
      },
    });
  }
  if (cycle.status === "NOT_STARTED") {
    await db.reviewCycle.update({ where: { id: cycle.id }, data: { status: "DRAFT" } });
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

// POST - submit: lock the reflection and snapshot performance data
export async function POST(_req: NextRequest, { params }: { params: { cycleId: string } }) {
  const session = await requireSession();
  const cycle = await loadCycleForOwner(params.cycleId, session.userId);
  if (!cycle) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cycle.status === "SUBMITTED" || cycle.status === "COMPLETED") {
    return NextResponse.json({ error: "already submitted" }, { status: 400 });
  }

  const u = cycle.user;
  await db.reviewCycle.update({
    where: { id: cycle.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      salarySnap: u.salary,
      billableTargetSnap: u.hasTargets ? u.billableTarget : null,
      billableActualSnap: u.hasTargets ? u.billableActual : null,
      revenueTargetSnap: u.hasTargets ? u.revenueTarget : null,
      revenueActualSnap: u.hasTargets ? u.revenueActual : null,
      dataPeriodSnap: u.dataPeriod,
    },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN", active: true } });
  if (admins.length) {
    await sendAdminSubmitted({
      to: admins.map((a) => a.email),
      staffName: u.name,
      cycleId: cycle.id,
    });
  }
  return NextResponse.json({ ok: true });
}

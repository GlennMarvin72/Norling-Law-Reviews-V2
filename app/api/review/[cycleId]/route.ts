import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - full review pack for the director
export async function GET(_req: NextRequest, { params }: { params: { cycleId: string } }) {
  await requireAdmin();
  const cycle = await db.reviewCycle.findUnique({
    where: { id: params.cycleId },
    include: { user: true, answers: { include: { question: { include: { section: true } } } } },
  });
  if (!cycle) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sections = await db.section.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      questions: {
        where: { active: true, ...(cycle.user.hasTargets ? {} : { requiresTargets: false }) },
        orderBy: { order: "asc" },
      },
    },
  });

  // Live data if not yet snapshotted (i.e. reflection not submitted yet)
  const perf = {
    salary: cycle.salarySnap ?? cycle.user.salary,
    billableTarget: cycle.billableTargetSnap ?? (cycle.user.hasTargets ? cycle.user.billableTarget : null),
    billableActual: cycle.billableActualSnap ?? (cycle.user.hasTargets ? cycle.user.billableActual : null),
    revenueTarget: cycle.revenueTargetSnap ?? (cycle.user.hasTargets ? cycle.user.revenueTarget : null),
    revenueActual: cycle.revenueActualSnap ?? (cycle.user.hasTargets ? cycle.user.revenueActual : null),
    dataPeriod: cycle.dataPeriodSnap ?? cycle.user.dataPeriod,
  };

  return NextResponse.json({ cycle, sections, perf });
}

// PUT - save director-side fields
export async function PUT(req: NextRequest, { params }: { params: { cycleId: string } }) {
  await requireAdmin();
  const body = await req.json();

  if (body.answers) {
    for (const a of body.answers) {
      await db.answer.upsert({
        where: { cycleId_questionId: { cycleId: params.cycleId, questionId: a.questionId } },
        update: {
          directorRating: a.directorRating ?? null,
          directorNotes: a.directorNotes ?? null,
          agreedFocus: a.agreedFocus ?? null,
        },
        create: {
          cycleId: params.cycleId,
          questionId: a.questionId,
          directorRating: a.directorRating ?? null,
          directorNotes: a.directorNotes ?? null,
          agreedFocus: a.agreedFocus ?? null,
        },
      });
    }
  }

  const cycleFields: any = {};
  for (const key of [
    "compNotes",
    "recommendation",
    "increaseAmount",
    "compRationale",
    "agreedActions",
    "proudNotes",
  ]) {
    if (key in body) cycleFields[key] = body[key];
  }
  if (Object.keys(cycleFields).length) {
    await db.reviewCycle.update({ where: { id: params.cycleId }, data: cycleFields });
  }

  return NextResponse.json({ ok: true });
}

// POST - mark the review completed
export async function POST(_req: NextRequest, { params }: { params: { cycleId: string } }) {
  await requireAdmin();
  await db.reviewCycle.update({
    where: { id: params.cycleId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

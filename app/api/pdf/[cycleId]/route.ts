import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewPackPdf } from "@/lib/pdf/ReviewPack";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { cycleId: string } }) {
  await requireAdmin(); // salary and comp live in this doc - admins only

  const cycle = await db.reviewCycle.findUnique({
    where: { id: params.cycleId },
    include: { user: true, answers: true },
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

  const perf = {
    salary: cycle.salarySnap ?? cycle.user.salary,
    billableTarget: cycle.billableTargetSnap ?? (cycle.user.hasTargets ? cycle.user.billableTarget : null),
    billableActual: cycle.billableActualSnap ?? (cycle.user.hasTargets ? cycle.user.billableActual : null),
    revenueTarget: cycle.revenueTargetSnap ?? (cycle.user.hasTargets ? cycle.user.revenueTarget : null),
    revenueActual: cycle.revenueActualSnap ?? (cycle.user.hasTargets ? cycle.user.revenueActual : null),
    dataPeriod: cycle.dataPeriodSnap ?? cycle.user.dataPeriod,
  };

  // ?comp=0 produces a version safe to share with the employee
  const includeComp = req.nextUrl.searchParams.get("comp") !== "0";

  const buffer = await renderToBuffer(
    React.createElement(ReviewPackPdf, { pack: { cycle, sections, perf }, includeComp }) as any
  );

  const filename = `Annual_Review_${cycle.user.name.replace(/\s+/g, "_")}.pdf`;
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE - cancel a review cycle. Only allowed before submission;
// once a reflection is submitted it's part of the record.
export async function DELETE(_req: NextRequest, { params }: { params: { cycleId: string } }) {
  await requireAdmin();
  const cycle = await db.reviewCycle.findUnique({
    where: { id: params.cycleId },
    include: { user: { select: { name: true } } },
  });
  if (!cycle) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (cycle.status === "SUBMITTED" || cycle.status === "COMPLETED") {
    return NextResponse.json(
      { error: `${cycle.user.name}'s reflection has already been ${cycle.status === "COMPLETED" ? "completed" : "submitted"} - it can't be cancelled.` },
      { status: 400 }
    );
  }
  await db.reviewCycle.delete({ where: { id: params.cycleId } });
  return NextResponse.json({ ok: true });
}

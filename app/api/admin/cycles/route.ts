import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendStaffKickoff, sendAdminKickoff } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST { userId, reviewDate } - manually kick off a review cycle now.
// Sends the same kickoff emails the scheduler would, and marks the
// 3-week reminder as sent so the daily job doesn't double up.
export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { userId, reviewDate } = body;
  if (!userId || !reviewDate) {
    return NextResponse.json({ error: "userId and reviewDate are required" }, { status: 400 });
  }

  const person = await db.user.findUnique({ where: { id: userId } });
  if (!person || !person.active) {
    return NextResponse.json({ error: "Person not found or inactive" }, { status: 404 });
  }

  // Guard: don't open a second cycle if one is already in flight
  const open = await db.reviewCycle.findFirst({
    where: { userId, status: { in: ["NOT_STARTED", "DRAFT", "SUBMITTED"] } },
  });
  if (open) {
    return NextResponse.json(
      { error: `${person.name} already has an open review (status: ${open.status.replace("_", " ").toLowerCase()})` },
      { status: 409 }
    );
  }

  const cycle = await db.reviewCycle.create({
    data: {
      userId,
      reviewDate: new Date(reviewDate),
      staffReminder3w: true, // kickoff handled here, cron won't resend
    },
  });

  // Send the kickoff emails and report how they went
  const admins = await db.user.findMany({ where: { role: "ADMIN", active: true, reviewNotifications: true } });
  const adminEmails = admins.map((a) => a.email);
  const emailNotes: string[] = [];

  const staffResult = await sendStaffKickoff({
    to: person.email,
    name: person.name,
    reviewDate: cycle.reviewDate,
    cycleId: cycle.id,
  });
  if (!staffResult.ok) emailNotes.push(`Staff email to ${person.email}: ${staffResult.detail}`);

  if (adminEmails.length) {
    const adminResult = await sendAdminKickoff({
      to: adminEmails,
      staffName: person.name,
      reviewDate: cycle.reviewDate,
    });
    if (!adminResult.ok) emailNotes.push(`Admin email: ${adminResult.detail}`);
  }

  return NextResponse.json({ ok: true, cycleId: cycle.id, emailNotes });
}

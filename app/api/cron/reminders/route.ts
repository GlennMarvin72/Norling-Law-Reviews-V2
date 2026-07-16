import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendStaffKickoff,
  sendStaffNudge,
  sendAdminKickoff,
  sendAdminMissingFlag,
  sendAdminNotBooked,
} from "@/lib/email";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

// Next occurrence of the person's anniversary (month/day of startDate).
function nextAnniversary(startDate: Date, now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  if (d.getTime() < now.getTime() - DAY) d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const now = new Date();
  const admins = await db.user.findMany({
    where: { active: true, OR: [{ role: "ADMIN", reviewNotifications: true }, { scheduler: true }] },
  });
  const extraEmails = (process.env.REVIEW_SCHEDULER_EMAILS ?? "")
    .split(",").map((e) => e.trim()).filter(Boolean);
  const adminEmails = Array.from(new Set([...admins.map((a) => a.email), ...extraEmails]));
  const log: string[] = [];

  const staff = await db.user.findMany({ where: { active: true } });

  for (const person of staff) {
    const reviewDate = nextAnniversary(person.startDate, now);
    const daysOut = Math.round((reviewDate.getTime() - now.getTime()) / DAY);

    // 1. Create the cycle + kickoff emails at T-21 days
    if (daysOut <= 21 && daysOut >= 0) {
      let cycle = await db.reviewCycle.findFirst({
        where: { userId: person.id, reviewDate },
      });
      if (!cycle) {
        // Skip if a manually started cycle is already in flight for this person
        const open = await db.reviewCycle.findFirst({
          where: {
            userId: person.id,
            status: { in: ["NOT_STARTED", "DRAFT", "SUBMITTED"] },
          },
        });
        if (open) continue;
        cycle = await db.reviewCycle.create({
          data: { userId: person.id, reviewDate },
        });
        await sendStaffKickoff({
          to: person.email,
          name: person.name,
          reviewDate,
          cycleId: cycle.id,
        });
        if (adminEmails.length) {
          await sendAdminKickoff({
            to: adminEmails,
            staffName: person.name,
            reviewDate,
          });
        }
        await db.reviewCycle.update({
          where: { id: cycle.id },
          data: { staffReminder3w: true },
        });
        log.push(`created cycle + kickoff: ${person.name}`);
        continue;
      }

      const notSubmitted = cycle.status === "NOT_STARTED" || cycle.status === "DRAFT";

      // 2. One-week nudge if not submitted
      if (daysOut <= 7 && notSubmitted && !cycle.staffReminder1w) {
        await sendStaffNudge({
          to: person.email,
          name: person.name,
          reviewDate,
          cycleId: cycle.id,
        });
        await db.reviewCycle.update({
          where: { id: cycle.id },
          data: { staffReminder1w: true },
        });
        log.push(`1-week nudge: ${person.name}`);
      }

      // 2b. Seven-day flag to admins if the meeting hasn't been booked
      if (daysOut <= 7 && !cycle.meetingBooked && !cycle.bookingFlag7d && adminEmails.length) {
        await sendAdminNotBooked({
          to: adminEmails,
          staffName: person.name,
          reviewDate,
        });
        await db.reviewCycle.update({
          where: { id: cycle.id },
          data: { bookingFlag7d: true },
        });
        log.push(`7-day not-booked flag: ${person.name}`);
      }

      // 3. Three-day flag to admins if still missing
      if (daysOut <= 3 && notSubmitted && !cycle.adminFlag3d && adminEmails.length) {
        await sendAdminMissingFlag({
          to: adminEmails,
          staffName: person.name,
          reviewDate,
        });
        await db.reviewCycle.update({
          where: { id: cycle.id },
          data: { adminFlag3d: true },
        });
        log.push(`3-day flag: ${person.name}`);
      }
    }
  }

  return NextResponse.json({ ok: true, ran: now.toISOString(), log });
}

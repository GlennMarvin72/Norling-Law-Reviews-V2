import { Resend } from "resend";

const from = process.env.EMAIL_FROM ?? "Norling Law Reviews <onboarding@resend.dev>";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export type SendResult = { ok: boolean; detail?: string };

async function send(opts: {
  to: string[];
  subject: string;
  html: string;
  icsContent?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "placeholder") {
    console.log("[email skipped - RESEND_API_KEY missing or placeholder]", opts.subject);
    return { ok: false, detail: "RESEND_API_KEY is missing or still set to 'placeholder' in Vercel." };
  }
  const resend = new Resend(key);
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.icsContent
        ? [
            {
              filename: "annual-review.ics",
              content: Buffer.from(opts.icsContent).toString("base64"),
            },
          ]
        : undefined,
    });
    if (error) {
      console.error("[email rejected by Resend]", opts.subject, JSON.stringify(error));
      return { ok: false, detail: `Resend rejected the email: ${error.message ?? JSON.stringify(error)}` };
    }
    console.log("[email sent]", opts.subject, data?.id);
    return { ok: true };
  } catch (e: any) {
    console.error("[email send threw]", opts.subject, e?.message);
    return { ok: false, detail: `Email send failed: ${e?.message ?? "unknown error"}` };
  }
}

const wrap = (body: string) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#000">
    <div style="padding:24px 0 16px;border-bottom:3px solid #ECB034">
      <strong style="font-size:18px">norling law<span style="color:#ECB034">.</span></strong>
    </div>
    <div style="padding:24px 0;font-size:15px;line-height:1.6">${body}</div>
    <div style="padding:16px 0;border-top:1px solid #C5B9AC;color:#63666A;font-size:12px">
      Norling Law annual reviews
    </div>
  </div>`;

export async function sendStaffKickoff(opts: {
  to: string;
  name: string;
  reviewDate: Date;
  cycleId: string;
}) {
  const date = opts.reviewDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
  return send({
    to: [opts.to],
    subject: `Your annual review is coming up - ${date}`,
    html: wrap(`
      <p>Hi ${opts.name.split(" ")[0]},</p>
      <p>Your annual review is due around <strong>${date}</strong> - three weeks away. A meeting time will be booked into your calendar by Brent's office.</p>
      <p>Please complete your reflection before the review. You can save as you go and come back any time - submit it before your meeting.</p>
      <p><a href="${appUrl}/reflection/${opts.cycleId}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block">Start my reflection</a></p>
      <p>Cheers</p>`),
  });
}

export async function sendAdminMeetingBooked(opts: {
  to: string[];
  staffName: string;
}) {
  return send({
    to: opts.to,
    subject: `Review meeting booked - ${opts.staffName}`,
    html: wrap(`
      <p><strong>${opts.staffName}</strong> has confirmed their review meeting is booked.</p>
      <p><a href="${appUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block">Open the Reviews app</a></p>`),
  });
}

export async function sendAdminNotBooked(opts: {
  to: string[];
  staffName: string;
  reviewDate: Date;
}) {
  const date = opts.reviewDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
  return send({
    to: opts.to,
    subject: `Flag - ${opts.staffName} hasn't booked their review meeting (due ${date})`,
    html: wrap(`
      <p><strong>${opts.staffName}</strong>'s review is due around <strong>${date}</strong> - less than a week away - and their meeting hasn't been confirmed as booked.</p>
      <p>May pay to give them a nudge.</p>`),
  });
}

export async function sendStaffNudge(opts: {
  to: string;
  name: string;
  reviewDate: Date;
  cycleId: string;
}) {
  const date = opts.reviewDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
  return send({
    to: [opts.to],
    subject: `Reminder - reflection due before your review on ${date}`,
    html: wrap(`
      <p>Hi ${opts.name.split(" ")[0]},</p>
      <p>Quick nudge - your annual review is one week away (${date}) and your reflection hasn't been submitted yet.</p>
      <p><a href="${appUrl}/reflection/${opts.cycleId}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block">Complete my reflection</a></p>
      <p>Cheers</p>`),
  });
}

export async function sendAdminKickoff(opts: {
  to: string[];
  staffName: string;
  reviewDate: Date;
}) {
  const date = opts.reviewDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
  return send({
    to: opts.to,
    subject: `Action - book ${opts.staffName}'s annual review (due ${date})`,
    html: wrap(`
      <p>Hi,</p>
      <p><strong>${opts.staffName}</strong>'s annual review is due around <strong>${date}</strong> - three weeks from today. Their reflection request has just gone out.</p>
      <p><strong>Action needed:</strong> check the schedule and book the review meeting in on or around ${date}, then mark it as booked in the Reviews app so it's tracked. A reminder will fire if it's still unbooked a week out.</p>
      <p><a href="${appUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block">Open the Reviews app</a></p>`),
  });
}

export async function sendAdminSubmitted(opts: {
  to: string[];
  staffName: string;
  cycleId: string;
}) {
  return send({
    to: opts.to,
    subject: `Reflection submitted - ${opts.staffName}`,
    html: wrap(`
      <p><strong>${opts.staffName}</strong> has submitted their reflection.</p>
      <p><a href="${appUrl}/review/${opts.cycleId}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block">Open the review pack</a></p>`),
  });
}

export async function sendAdminMissingFlag(opts: {
  to: string[];
  staffName: string;
  reviewDate: Date;
}) {
  const date = opts.reviewDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
  return send({
    to: opts.to,
    subject: `Flag - ${opts.staffName}'s reflection still missing (review ${date})`,
    html: wrap(`
      <p><strong>${opts.staffName}</strong>'s review is on <strong>${date}</strong> - three days away - and their reflection hasn't been submitted.</p>
      <p>May pay to give them a nudge in person.</p>`),
  });
}

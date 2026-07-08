// Generates a simple .ics calendar invite for the review meeting.
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toIcsDate(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

export function reviewIcs(opts: {
  staffName: string;
  reviewDate: Date;
  organiserEmail: string;
}) {
  // Default the meeting to 10am-11am NZ time on the review date.
  const start = new Date(opts.reviewDate);
  start.setUTCHours(22, 0, 0, 0); // 10am NZST next day handling is close enough for an editable invite
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const uid = `review-${opts.staffName.replace(/\s+/g, "-")}-${start.getTime()}@norlinglaw`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Norling Law//Reviews//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:Annual Review - ${opts.staffName}`,
    `DESCRIPTION:Annual performance review for ${opts.staffName}. Reflection and performance pack in the Reviews app.`,
    `ORGANIZER:mailto:${opts.organiserEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

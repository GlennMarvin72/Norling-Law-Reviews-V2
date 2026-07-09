import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Accepts DD/MM/YYYY (NZ), DD-MM-YYYY, YYYY-MM-DD, and Excel serial numbers
function parseDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  // NZ style: 30/06/2021 or 30-06-2021 or 30.06.2021
  const nz = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (nz) {
    const d = new Date(Date.UTC(Number(nz[3]), Number(nz[2]) - 1, Number(nz[1])));
    return isNaN(d.getTime()) ? undefined : d;
  }
  // ISO style: 2021-06-30
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return isNaN(d.getTime()) ? undefined : d;
  }
  // Excel serial number (days since 30/12/1899)
  if (/^\d{4,6}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file received." }, { status: 400 });

    let text = await file.text();
    // Strip Excel's BOM if present
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_"),
    });

    if (!parsed.data.length) {
      return NextResponse.json({
        ok: false,
        results: ["No rows found. Check the file is a CSV with a header row (email, name, start_date, ...)."],
      });
    }

    const headers = Object.keys(parsed.data[0] ?? {});
    if (!headers.includes("email")) {
      return NextResponse.json({
        ok: false,
        results: [
          `Couldn't find an 'email' column. Headers found: ${headers.join(", ") || "none"}.`,
          "Expected headers: email, name, start_date, salary, billable_target, billable_actual, revenue_target, revenue_actual, period.",
        ],
      });
    }

    const num = (v?: string) => {
      if (v == null) return undefined;
      const s = String(v).replace(/[$,\s]/g, "");
      if (!s) return undefined;
      const n = Number(s);
      return Number.isFinite(n) ? n : undefined;
    };

    const results: string[] = [];
    let row = 1;
    for (const r of parsed.data) {
      row += 1;
      const email = r.email?.toLowerCase().trim();
      if (!email) {
        results.push(`Row ${row}: skipped - no email.`);
        continue;
      }
      try {
        const salary = num(r.salary);
        const billableTarget = num(r.billable_target);
        const billableActual = num(r.billable_actual);
        const revenueTarget = num(r.revenue_target);
        const revenueActual = num(r.revenue_actual);
        const hasTargets = billableTarget != null || revenueTarget != null;
        const startDate = parseDate(r.start_date);

        if (r.start_date && !startDate) {
          results.push(`Row ${row} (${email}): couldn't read start_date "${r.start_date}" - use DD/MM/YYYY.`);
          continue;
        }

        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
          await db.user.update({
            where: { email },
            data: {
              ...(r.name && { name: r.name.trim() }),
              ...(salary != null && { salary }),
              ...(billableTarget != null && { billableTarget }),
              ...(billableActual != null && { billableActual }),
              ...(revenueTarget != null && { revenueTarget }),
              ...(revenueActual != null && { revenueActual }),
              ...(hasTargets && { hasTargets: true }),
              ...(r.period && { dataPeriod: r.period.trim() }),
              ...(startDate && { startDate }),
            },
          });
          results.push(`Updated ${email}`);
        } else if (r.name && startDate) {
          await db.user.create({
            data: {
              email,
              name: r.name.trim(),
              position: r.position?.trim() || null,
              startDate,
              salary,
              billableTarget,
              billableActual,
              revenueTarget,
              revenueActual,
              hasTargets,
              dataPeriod: r.period?.trim() || null,
            },
          });
          results.push(`Created ${email}`);
        } else {
          results.push(`Row ${row} (${email}): skipped - person doesn't exist yet, and creating them needs name + start_date.`);
        }
      } catch (e: any) {
        results.push(`Row ${row} (${email}): failed - ${e?.message ?? "unknown error"}`);
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED" || e?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not signed in as an admin - refresh and sign in again." }, { status: 403 });
    }
    return NextResponse.json({ error: `Upload failed: ${e?.message ?? "unknown error"}` }, { status: 500 });
  }
}

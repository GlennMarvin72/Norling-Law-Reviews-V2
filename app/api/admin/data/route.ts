import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST - CSV upload. Expected headers (extras ignored, case-insensitive):
// email, name, start_date, salary, billable_target, billable_actual,
// revenue_target, revenue_actual, period
export async function POST(req: NextRequest) {
  await requireAdmin();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const num = (v?: string) => {
    if (!v) return undefined;
    const n = Number(String(v).replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const results: string[] = [];
  for (const row of parsed.data) {
    const email = row.email?.toLowerCase().trim();
    if (!email) continue;
    const salary = num(row.salary);
    const billableTarget = num(row.billable_target);
    const billableActual = num(row.billable_actual);
    const revenueTarget = num(row.revenue_target);
    const revenueActual = num(row.revenue_actual);
    const hasTargets = billableTarget != null || revenueTarget != null;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.user.update({
        where: { email },
        data: {
          ...(salary != null && { salary }),
          ...(billableTarget != null && { billableTarget }),
          ...(billableActual != null && { billableActual }),
          ...(revenueTarget != null && { revenueTarget }),
          ...(revenueActual != null && { revenueActual }),
          ...(hasTargets && { hasTargets: true }),
          ...(row.period && { dataPeriod: row.period }),
          ...(row.start_date && { startDate: new Date(row.start_date) }),
        },
      });
      results.push(`updated ${email}`);
    } else if (row.name && row.start_date) {
      await db.user.create({
        data: {
          email,
          name: row.name,
          startDate: new Date(row.start_date),
          salary,
          billableTarget,
          billableActual,
          revenueTarget,
          revenueActual,
          hasTargets,
          dataPeriod: row.period || null,
        },
      });
      results.push(`created ${email}`);
    } else {
      results.push(`skipped ${email} - not found and no name/start_date to create them`);
    }
  }
  return NextResponse.json({ ok: true, results });
}

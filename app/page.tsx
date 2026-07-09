import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import CancelReviewButton from "@/components/CancelReviewButton";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  NOT_STARTED: "Not started",
  DRAFT: "In progress",
  SUBMITTED: "Submitted - ready for review",
  COMPLETED: "Completed",
};

const statusStyle: Record<string, string> = {
  NOT_STARTED: "bg-stonelight text-greydark",
  DRAFT: "bg-gold/20 text-ink",
  SUBMITTED: "bg-gold text-ink",
  COMPLETED: "bg-ink text-white",
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

export default async function Home() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session) return null; // middleware redirects to sign-in

  if (session.role === "ADMIN") {
    const cycles = await db.reviewCycle.findMany({
      include: { user: true },
      orderBy: { reviewDate: "asc" },
    });
    const upcoming = cycles.filter((c) => c.status !== "COMPLETED");
    const done = cycles.filter((c) => c.status === "COMPLETED").slice(-10).reverse();
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Review pipeline</h1>
          <p className="text-greydark text-sm">
            Cycles are created automatically three weeks before each person&apos;s anniversary.
          </p>
        </div>
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-greydark">Upcoming</h2>
          {upcoming.length === 0 && (
            <div className="card text-sm text-greydark">
              Nothing in the pipeline. Add staff and anniversary dates under Staff, and the daily
              scheduler will pick them up.
            </div>
          )}
          {upcoming.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{c.user.name}</div>
                <div className="text-sm text-greydark">Review {fmt(c.reviewDate)}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-3 py-1 ${statusStyle[c.status]}`}>
                  {statusLabel[c.status]}
                </span>
                {(c.status === "NOT_STARTED" || c.status === "DRAFT") && (
                  <CancelReviewButton cycleId={c.id} name={c.user.name} />
                )}
                <Link className="btn" href={`/review/${c.id}`}>
                  Open review
                </Link>
              </div>
            </div>
          ))}
        </section>
        {done.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-greydark">
              Recently completed
            </h2>
            {done.map((c) => (
              <div key={c.id} className="card flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{c.user.name}</div>
                  <div className="text-sm text-greydark">Reviewed {fmt(c.reviewDate)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <a className="btn-gold" href={`/api/pdf/${c.id}`}>
                    PDF pack
                  </a>
                  <Link className="btn" href={`/review/${c.id}`}>
                    View
                  </Link>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  // Staff view
  const me = await db.user.findUnique({ where: { id: session.userId } });
  const cycles = await db.reviewCycle.findMany({
    where: { userId: session.userId },
    orderBy: { reviewDate: "desc" },
  });
  const current = cycles.find((c) => c.status !== "COMPLETED");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Kia ora, {me?.name.split(" ")[0]}</h1>
        <p className="text-greydark text-sm">Your annual review reflections live here.</p>
      </div>
      {current ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Annual review - {fmt(current.reviewDate)}</div>
              <div className="text-sm text-greydark">
                Complete your reflection before the review. Save as you go - you can come back any
                time.
              </div>
            </div>
            <span className={`text-xs px-3 py-1 ${statusStyle[current.status]}`}>
              {statusLabel[current.status]}
            </span>
          </div>
          {current.status !== "SUBMITTED" ? (
            <Link className="btn-gold" href={`/reflection/${current.id}`}>
              {current.status === "DRAFT" ? "Continue my reflection" : "Start my reflection"}
            </Link>
          ) : (
            <p className="text-sm text-greydark">
              Submitted - nothing more to do until your review meeting. Nice one.
            </p>
          )}
        </div>
      ) : (
        <div className="card text-sm text-greydark">
          No review is open right now. You&apos;ll get an email three weeks before your review date
          when your reflection opens.
        </div>
      )}
      {cycles.filter((c) => c.status === "COMPLETED").length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-greydark">
            Past reviews
          </h2>
          {cycles
            .filter((c) => c.status === "COMPLETED")
            .map((c) => (
              <div key={c.id} className="card text-sm">
                Reviewed {fmt(c.reviewDate)}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

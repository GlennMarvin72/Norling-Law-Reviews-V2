"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = { id: string; type: "VALUE" | "LONGTEXT"; label: string; helpText?: string | null };
type Section = { id: string; title: string; questions: Question[] };
type Answer = {
  questionId: string;
  selfRating?: string | null;
  selfText?: string | null;
  selfFocus?: string | null;
  directorRating?: string | null;
  directorNotes?: string | null;
  agreedFocus?: string | null;
};
type Action = { action: string; owner: string; byWhen: string };

const ratings = ["DEVELOPING", "MEETING", "EXCEEDING"];
const ratingLabel: Record<string, string> = {
  DEVELOPING: "Developing",
  MEETING: "Meeting",
  EXCEEDING: "Exceeding",
};

const money = (n?: number | null) =>
  n == null ? "-" : n.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

export default function ReviewPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [cycleFields, setCycleFields] = useState<any>({});
  const [actions, setActions] = useState<Action[]>([]);
  const [saveState, setSaveState] = useState("idle");
  const dirtyAnswers = useRef<Set<string>>(new Set());
  const dirtyCycle = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/review/${cycleId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const map: Record<string, Answer> = {};
        for (const a of d.cycle.answers ?? []) map[a.questionId] = a;
        setAnswers(map);
        setCycleFields({
          compNotes: d.cycle.compNotes ?? "",
          recommendation: d.cycle.recommendation ?? "",
          increaseAmount: d.cycle.increaseAmount ?? "",
          compRationale: d.cycle.compRationale ?? "",
          proudNotes: d.cycle.proudNotes ?? "",
        });
        setActions((d.cycle.agreedActions as Action[]) ?? []);
      });
  }, [cycleId]);

  const save = useCallback(async () => {
    setSaveState("saving");
    const payload: any = {};
    if (dirtyAnswers.current.size) {
      payload.answers = Array.from(dirtyAnswers.current).map((questionId) => ({
        questionId,
        directorRating: answers[questionId]?.directorRating,
        directorNotes: answers[questionId]?.directorNotes,
        agreedFocus: answers[questionId]?.agreedFocus,
      }));
    }
    if (dirtyCycle.current) {
      Object.assign(payload, cycleFields, {
        increaseAmount: cycleFields.increaseAmount === "" ? null : Number(cycleFields.increaseAmount),
        agreedActions: actions,
      });
    }
    await fetch(`/api/review/${cycleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    dirtyAnswers.current.clear();
    dirtyCycle.current = false;
    setSaveState("saved");
  }, [answers, cycleFields, actions, cycleId]);

  const queueSave = () => {
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 1500);
  };

  const updateAnswer = (questionId: string, patch: Partial<Answer>) => {
    setAnswers((p) => ({ ...p, [questionId]: { ...p[questionId], questionId, ...patch } }));
    dirtyAnswers.current.add(questionId);
    queueSave();
  };
  const updateCycle = (patch: any) => {
    setCycleFields((p: any) => ({ ...p, ...patch }));
    dirtyCycle.current = true;
    queueSave();
  };
  const updateActions = (next: Action[]) => {
    setActions(next);
    dirtyCycle.current = true;
    queueSave();
  };

  const complete = async () => {
    if (!confirm("Mark this review as completed?")) return;
    await save();
    await fetch(`/api/review/${cycleId}`, { method: "POST" });
    router.push("/");
  };

  if (!data) return <p className="text-sm text-greydark">Loading review pack...</p>;

  const { cycle, sections, perf } = data;
  const billableVariance =
    perf.billableTarget && perf.billableActual != null
      ? (((perf.billableActual - perf.billableTarget) / perf.billableTarget) * 100).toFixed(1) + "%"
      : "-";
  const returnOnSalary =
    perf.salary && perf.revenueActual != null ? (perf.revenueActual / perf.salary).toFixed(2) + "x" : "-";

  return (
    <div className="space-y-10 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cycle.user.name}</h1>
          <p className="text-greydark text-sm">
            {cycle.user.position ?? ""} · Review{" "}
            {new Date(cycle.reviewDate).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {cycle.status.replace("_", " ").toLowerCase()}
          </p>
        </div>
        <a className="btn-gold" href={`/api/pdf/${cycleId}`}>
          Download PDF pack
        </a>
      </div>

      {/* Performance data */}
      <section className="card">
        <h2 className="text-sm font-medium uppercase tracking-wide text-greydark mb-4">
          Performance data {perf.dataPeriod ? `(${perf.dataPeriod})` : ""}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="label">Billable hours</div>
            <div className="text-lg font-semibold">
              {perf.billableActual ?? "-"}
              {perf.billableTarget ? ` / ${perf.billableTarget}` : ""}
            </div>
            <div className="text-greydark">Variance {billableVariance}</div>
          </div>
          <div>
            <div className="label">Revenue delivered</div>
            <div className="text-lg font-semibold">{money(perf.revenueActual)}</div>
            <div className="text-greydark">
              {perf.revenueTarget ? `Target ${money(perf.revenueTarget)}` : "No revenue target"}
            </div>
          </div>
          <div>
            <div className="label">Salary (director only)</div>
            <div className="text-lg font-semibold">{money(perf.salary)}</div>
          </div>
          <div>
            <div className="label">Return on salary</div>
            <div className="text-lg font-semibold">{returnOnSalary}</div>
          </div>
        </div>
      </section>

      {/* Values + questions */}
      {sections.map((section: Section) => (
        <section key={section.id} className="space-y-6">
          <h2 className="text-lg font-semibold border-b-2 border-gold pb-2">{section.title}</h2>
          {section.questions.map((q) => {
            const a = answers[q.id] ?? { questionId: q.id };
            return (
              <div key={q.id} className="card space-y-4">
                <h3 className="font-medium">{q.label}</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-greydark">
                      Self-assessment
                    </div>
                    {q.type === "VALUE" && (
                      <div className="text-sm">
                        Rating:{" "}
                        <span className="font-medium">
                          {a.selfRating ? ratingLabel[a.selfRating] : "Not rated"}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{a.selfText || "No reflection provided."}</p>
                    {a.selfFocus && (
                      <p className="text-sm text-greydark whitespace-pre-wrap">
                        <span className="font-medium text-ink">Their focus area: </span>
                        {a.selfFocus}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 md:border-l md:border-stone md:pl-6">
                    <div className="text-xs font-medium uppercase tracking-wide text-greydark">
                      Director assessment
                    </div>
                    {q.type === "VALUE" && (
                      <div className="flex gap-2">
                        {ratings.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => updateAnswer(q.id, { directorRating: r })}
                            className={`px-3 py-1.5 text-xs border ${
                              a.directorRating === r
                                ? "bg-ink text-white border-ink"
                                : "bg-white border-stone hover:border-gold"
                            }`}
                          >
                            {ratingLabel[r]}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      className="input min-h-20"
                      placeholder="Observations and discussion notes"
                      value={a.directorNotes ?? ""}
                      onChange={(e) => updateAnswer(q.id, { directorNotes: e.target.value })}
                    />
                    {q.type === "VALUE" && (
                      <textarea
                        className="input min-h-16"
                        placeholder="Agreed focus for next period"
                        value={a.agreedFocus ?? ""}
                        onChange={(e) => updateAnswer(q.id, { agreedFocus: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {/* Agreed actions */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Agreed actions and commitments</h2>
        {actions.map((act, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="input col-span-6"
              placeholder="Action"
              value={act.action}
              onChange={(e) => updateActions(actions.map((a, j) => (j === i ? { ...a, action: e.target.value } : a)))}
            />
            <input
              className="input col-span-3"
              placeholder="Owner"
              value={act.owner}
              onChange={(e) => updateActions(actions.map((a, j) => (j === i ? { ...a, owner: e.target.value } : a)))}
            />
            <input
              className="input col-span-2"
              placeholder="By when"
              value={act.byWhen}
              onChange={(e) => updateActions(actions.map((a, j) => (j === i ? { ...a, byWhen: e.target.value } : a)))}
            />
            <button
              className="col-span-1 text-greydark hover:text-ink"
              onClick={() => updateActions(actions.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn" onClick={() => updateActions([...actions, { action: "", owner: "", byWhen: "" }])}>
          Add action
        </button>
      </section>

      {/* Comp - director only */}
      <section className="card space-y-4 border-2 border-ink">
        <h2 className="text-lg font-semibold">
          Compensation review <span className="text-xs font-normal text-greydark">(never shared with employee, excluded from staff view)</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <span className="label">Recommendation</span>
            <select
              className="input"
              value={cycleFields.recommendation}
              onChange={(e) => updateCycle({ recommendation: e.target.value })}
            >
              <option value="">-</option>
              <option value="NO_CHANGE">No change</option>
              <option value="INCREASE">Increase</option>
              <option value="FURTHER_REVIEW">Further review required</option>
            </select>
          </div>
          <div>
            <span className="label">Increase amount (if any)</span>
            <input
              className="input"
              type="number"
              value={cycleFields.increaseAmount}
              onChange={(e) => updateCycle({ increaseAmount: e.target.value })}
            />
          </div>
        </div>
        <div>
          <span className="label">Rationale</span>
          <textarea
            className="input min-h-20"
            value={cycleFields.compRationale}
            onChange={(e) => updateCycle({ compRationale: e.target.value })}
          />
        </div>
        <div>
          <span className="label">Overall value assessment / notes</span>
          <textarea
            className="input min-h-20"
            value={cycleFields.compNotes}
            onChange={(e) => updateCycle({ compNotes: e.target.value })}
          />
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-ink text-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-greymid">
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "All changes saved" : "Editing"}
          </span>
          <div className="flex gap-3">
            <button className="text-sm underline" onClick={save}>
              Save
            </button>
            <button className="btn-gold" onClick={complete}>
              Mark review completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

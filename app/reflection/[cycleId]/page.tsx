"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string;
  type: "VALUE" | "LONGTEXT";
  label: string;
  helpText?: string | null;
};
type Section = { id: string; title: string; intro?: string | null; questions: Question[] };
type AnswerDraft = { selfRating?: string | null; selfText?: string | null; selfFocus?: string | null };

const MAX_CHARS = 300;

function Counter({ value }: { value?: string | null }) {
  const len = value?.length ?? 0;
  return (
    <div className={`text-xs mt-1 text-right ${len >= MAX_CHARS ? "text-red-700" : "text-greydark"}`}>
      {len}/{MAX_CHARS}
    </div>
  );
}

const ratings = [
  { value: "DEVELOPING", label: "Developing" },
  { value: "MEETING", label: "Meeting" },
  { value: "EXCEEDING", label: "Exceeding" },
];

export default function ReflectionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [status, setStatus] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/reflection/${cycleId}`)
      .then((r) => r.json())
      .then((data) => {
        setSections(data.sections ?? []);
        setStatus(data.status);
        const map: Record<string, AnswerDraft> = {};
        for (const a of data.answers ?? []) {
          map[a.questionId] = { selfRating: a.selfRating, selfText: a.selfText, selfFocus: a.selfFocus };
        }
        setAnswers(map);
        setLoading(false);
      });
  }, [cycleId]);

  const save = useCallback(
    async (all = false) => {
      const ids = all ? Object.keys(answers) : Array.from(dirty.current);
      if (ids.length === 0) return;
      setSaveState("saving");
      const payload = ids.map((questionId) => ({ questionId, ...answers[questionId] }));
      await fetch(`/api/reflection/${cycleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      dirty.current.clear();
      setSaveState("saved");
    },
    [answers, cycleId]
  );

  const update = (questionId: string, patch: AnswerDraft) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
    dirty.current.add(questionId);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(), 1500);
  };

  const answeredCount = useMemo(
    () =>
      sections
        .flatMap((s) => s.questions)
        .filter((q) => {
          const a = answers[q.id];
          return a && (a.selfText?.trim() || a.selfRating);
        }).length,
    [sections, answers]
  );
  const totalCount = sections.flatMap((s) => s.questions).length;

  const submit = async () => {
    if (!confirm("Submit your reflection? You won't be able to edit it after this.")) return;
    await save(true);
    const res = await fetch(`/api/reflection/${cycleId}`, { method: "POST" });
    if (res.ok) router.push("/");
  };

  if (loading) return <p className="text-greydark text-sm">Loading your reflection...</p>;

  if (status === "SUBMITTED" || status === "COMPLETED") {
    return (
      <div className="card max-w-2xl">
        <p className="text-sm">
          This reflection has been submitted and is locked. Nothing more to do until your review
          meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-10 pb-24">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Annual review reflection</h1>
        <p className="text-greydark text-sm">
          Everything saves automatically as you type.
        </p>
      </div>

      <div className="card border-l-4 border-l-gold space-y-3">
        <h2 className="font-semibold">A note before you begin</h2>
        <div className="text-sm text-greydark leading-relaxed space-y-2">
          <p>
            This self-assessment is your opportunity to reflect on the period before your
            annual review conversation.
          </p>
          <p>There are no right or wrong answers.</p>
          <p>
            It is not designed or expected to be used for you to provide a comprehensive
            report or business case, but rather to highlight talking points to ensure we
            make the most of the time in the discussion.
          </p>
          <p>
            It is also not compulsory to provide context or a reflection on each value -
            you can focus on providing context or talking points on those you are most
            proud of or want to build on.
          </p>
          <p>
            Text boxes are deliberately restricted to avoid lengthy responses, so showcase
            your ability to be direct and concise in your responses.
          </p>
          <p>Please complete this independently and submit it prior to your review meeting.</p>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-6">
          <div className="border-b-2 border-gold pb-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.intro && <p className="text-sm text-greydark mt-1">{section.intro}</p>}
          </div>
          {section.questions.map((q) => {
            const a = answers[q.id] ?? {};
            return (
              <div key={q.id} className="card space-y-4">
                <div>
                  <h3 className="font-medium">{q.label}</h3>
                  {q.helpText && <p className="text-sm text-greydark mt-1">{q.helpText}</p>}
                </div>
                {q.type === "VALUE" && (
                  <>
                    <div>
                      <span className="label">Self-rating</span>
                      <div className="flex gap-2">
                        {ratings.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => update(q.id, { selfRating: r.value })}
                            className={`px-4 py-2 text-sm border transition-colors ${
                              a.selfRating === r.value
                                ? "bg-ink text-white border-ink"
                                : "bg-white border-stone hover:border-gold"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="label">Your reflection - evidence and examples</span>
                      <textarea
                        className="input min-h-28"
                        maxLength={MAX_CHARS}
                        value={a.selfText ?? ""}
                        onChange={(e) => update(q.id, { selfText: e.target.value })}
                      />
                      <Counter value={a.selfText} />
                    </div>
                    <div>
                      <span className="label">Area you want to focus on</span>
                      <textarea
                        className="input min-h-20"
                        maxLength={MAX_CHARS}
                        value={a.selfFocus ?? ""}
                        onChange={(e) => update(q.id, { selfFocus: e.target.value })}
                      />
                      <Counter value={a.selfFocus} />
                    </div>
                  </>
                )}
                {q.type === "LONGTEXT" && (
                  <div>
                    <textarea
                      className="input min-h-28"
                      maxLength={MAX_CHARS}
                      value={a.selfText ?? ""}
                      onChange={(e) => update(q.id, { selfText: e.target.value })}
                    />
                    <Counter value={a.selfText} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <div className="fixed bottom-0 left-0 right-0 bg-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-greymid">
            {answeredCount}/{totalCount} answered ·{" "}
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Unsaved changes"}
          </span>
          <div className="flex gap-3">
            <button className="text-sm underline" onClick={() => save(true)}>
              Save and finish later
            </button>
            <button className="btn-gold" onClick={submit}>
              Submit reflection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

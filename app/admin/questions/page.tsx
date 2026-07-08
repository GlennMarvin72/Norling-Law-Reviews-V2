"use client";

import { useEffect, useState } from "react";

export default function QuestionsAdmin() {
  const [sections, setSections] = useState<any[]>([]);
  const [newQ, setNewQ] = useState<any>({});

  const load = () => fetch("/api/admin/questions").then((r) => r.json()).then((d) => setSections(d.sections));
  useEffect(() => { load(); }, []);

  const api = async (method: string, body: any) => {
    await fetch("/api/admin/questions", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    load();
  };

  const move = (sectionId: string, qid: string, dir: -1 | 1) => {
    const section = sections.find((s) => s.id === sectionId);
    const idx = section.questions.findIndex((q: any) => q.id === qid);
    const swap = section.questions[idx + dir];
    if (!swap) return;
    api("PUT", { kind: "question", id: qid, order: swap.order });
    api("PUT", { kind: "question", id: swap.id, order: section.questions[idx].order });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Question builder</h1>
        <p className="text-sm text-greydark">
          Changes apply to reflections that haven&apos;t been submitted yet. Deactivate rather than
          expect deletes - past answers stay linked to their questions.
        </p>
      </div>

      {sections.map((s) => (
        <div key={s.id} className="space-y-3">
          <div className="flex items-center gap-3 border-b-2 border-gold pb-2">
            <input className="text-lg font-semibold bg-transparent flex-1 focus:outline-none" defaultValue={s.title}
              onBlur={(e) => api("PUT", { kind: "section", id: s.id, title: e.target.value })} />
          </div>
          {s.questions.map((q: any, i: number) => (
            <div key={q.id} className={`card space-y-2 ${!q.active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-stonelight">{q.type === "VALUE" ? "Rating + reflection" : "Free text"}</span>
                {q.requiresTargets && <span className="text-xs px-2 py-0.5 bg-gold">Targets only</span>}
                <div className="ml-auto flex gap-2 text-sm text-greydark">
                  <button onClick={() => move(s.id, q.id, -1)} disabled={i === 0}>↑</button>
                  <button onClick={() => move(s.id, q.id, 1)} disabled={i === s.questions.length - 1}>↓</button>
                  <button className="underline" onClick={() => api("PUT", { kind: "question", id: q.id, active: !q.active })}>
                    {q.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
              <input className="input font-medium" defaultValue={q.label}
                onBlur={(e) => api("PUT", { kind: "question", id: q.id, label: e.target.value })} />
              <textarea className="input text-sm" placeholder="Help text / behaviours to assess against" defaultValue={q.helpText ?? ""}
                onBlur={(e) => api("PUT", { kind: "question", id: q.id, helpText: e.target.value })} />
            </div>
          ))}
          <div className="card space-y-2 border-dashed">
            <div className="grid md:grid-cols-4 gap-2">
              <input className="input md:col-span-2" placeholder="New question label"
                value={newQ[s.id]?.label ?? ""} onChange={(e) => setNewQ({ ...newQ, [s.id]: { ...newQ[s.id], label: e.target.value } })} />
              <select className="input" value={newQ[s.id]?.type ?? "LONGTEXT"}
                onChange={(e) => setNewQ({ ...newQ, [s.id]: { ...newQ[s.id], type: e.target.value } })}>
                <option value="LONGTEXT">Free text</option>
                <option value="VALUE">Rating + reflection</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newQ[s.id]?.requiresTargets ?? false}
                  onChange={(e) => setNewQ({ ...newQ, [s.id]: { ...newQ[s.id], requiresTargets: e.target.checked } })} />
                Targets only
              </label>
            </div>
            <button className="btn" onClick={() => {
              if (!newQ[s.id]?.label) return;
              api("POST", { kind: "question", sectionId: s.id, ...newQ[s.id] });
              setNewQ({ ...newQ, [s.id]: {} });
            }}>Add question</button>
          </div>
        </div>
      ))}

      <div className="card space-y-2">
        <h2 className="font-medium">Add a section</h2>
        <input className="input" placeholder="Section title" id="new-section-title" />
        <button className="btn" onClick={() => {
          const el = document.getElementById("new-section-title") as HTMLInputElement;
          if (el.value) { api("POST", { kind: "section", title: el.value }); el.value = ""; }
        }}>Add section</button>
      </div>
    </div>
  );
}

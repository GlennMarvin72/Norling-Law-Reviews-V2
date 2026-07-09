"use client";

import { useEffect, useState } from "react";
import CsvUpload from "@/components/CsvUpload";

type User = {
  id: string; email: string; name: string; position?: string | null;
  role: string; startDate: string; active: boolean; hasTargets: boolean;
};

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function StaffAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", email: "", position: "", startDate: "", hasTargets: false });
  const [reviewDates, setReviewDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetch("/api/admin/staff").then((r) => r.json()).then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name || !form.email || !form.startDate) return alert("Name, email and start date are needed.");
    await fetch("/api/admin/staff", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", position: "", startDate: "", hasTargets: false });
    load();
  };

  const update = async (id: string, patch: any) => {
    await fetch("/api/admin/staff", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }),
    });
    load();
  };


  const startReview = async (u: User) => {
    const reviewDate = reviewDates[u.id] || plusDays(21);
    if (!confirm(`Start ${u.name}'s review now, with the review meeting on ${new Date(reviewDate).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}? They'll be emailed their reflection link straight away.`)) return;
    setBusy(u.id);
    const res = await fetch("/api/admin/cycles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, reviewDate }),
    });
    setBusy(null);
    const d = await res.json();
    if (!res.ok) return alert(d.error ?? "Could not start the review.");
    if (d.emailNotes?.length) {
      alert(`Review started for ${u.name} and it's in the pipeline - BUT the emails had problems:\n\n${d.emailNotes.join("\n")}`);
    } else {
      alert(`Review started for ${u.name}. Kickoff emails sent - it's now in the pipeline on the Home page.`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Staff</h1>
        <p className="text-sm text-greydark">
          Start date drives the review anniversary. Staff without billable targets never see or get
          measured on billable/revenue questions.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium">Bulk upload (CSV)</h2>
        <p className="text-sm text-greydark">
          Headers: email, name, start_date, salary, billable_target, billable_actual, revenue_target,
          revenue_actual, period. Rows match on email - existing people are updated, new people are
          created (name and start_date required for new). Extra columns are ignored.
        </p>
        <CsvUpload onDone={load} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium">Add a person</h2>
        <div className="grid md:grid-cols-5 gap-3">
          <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hasTargets} onChange={(e) => setForm({ ...form, hasTargets: e.target.checked })} />
            Has billable targets
          </label>
        </div>
        <button className="btn" onClick={add}>Add person</button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className={`card space-y-3 ${!u.active ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-48">
                <div className="font-medium">{u.name} {u.role === "ADMIN" && <span className="text-xs bg-gold px-2 py-0.5 ml-1">Admin</span>}</div>
                <div className="text-sm text-greydark">{u.email}{u.position ? ` \u00b7 ${u.position}` : ""}</div>
              </div>
              <label className="text-sm">
                <span className="label">Anniversary</span>
                <input className="input" type="date" defaultValue={u.startDate.slice(0, 10)}
                  onBlur={(e) => update(u.id, { startDate: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={u.hasTargets} onChange={(e) => update(u.id, { hasTargets: e.target.checked })} />
                Billable targets
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={u.role === "ADMIN"} onChange={async (e) => {
                  const makeAdmin = e.target.checked;
                  if (!confirm(makeAdmin
                    ? `Give ${u.name} admin rights? Admins see everything - all reflections, performance data, salaries and comp notes.`
                    : `Remove ${u.name}'s admin rights? They'll only see their own reflections.`)) { load(); return; }
                  const res = await fetch("/api/admin/staff", {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: u.id, role: makeAdmin ? "ADMIN" : "STAFF" }),
                  });
                  if (!res.ok) { const d = await res.json(); alert(d.error ?? "Could not change role."); }
                  load();
                }} />
                Admin
              </label>
            </div>
            {u.active && (
              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-stone">
                <label className="text-sm">
                  <span className="label">Review meeting date</span>
                  <input className="input" type="date" value={reviewDates[u.id] ?? plusDays(21)}
                    onChange={(e) => setReviewDates({ ...reviewDates, [u.id]: e.target.value })} />
                </label>
                <button className="btn-gold" disabled={busy === u.id} onClick={() => startReview(u)}>
                  {busy === u.id ? "Starting..." : "Start review now"}
                </button>
                <button className="text-sm underline text-greydark ml-auto" onClick={() => update(u.id, { active: false })}>
                  Deactivate
                </button>
              </div>
            )}
            {!u.active && (
              <button className="text-sm underline text-greydark" onClick={() => update(u.id, { active: true })}>
                Reactivate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

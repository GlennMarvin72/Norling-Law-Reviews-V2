"use client";

import { useEffect, useState } from "react";

type User = {
  id: string; email: string; name: string; position?: string | null;
  role: string; startDate: string; active: boolean; hasTargets: boolean;
};

export default function StaffAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", email: "", position: "", startDate: "", hasTargets: false });

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
          <div key={u.id} className={`card flex flex-wrap items-center gap-4 ${!u.active ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-48">
              <div className="font-medium">{u.name} {u.role === "ADMIN" && <span className="text-xs bg-gold px-2 py-0.5 ml-1">Admin</span>}</div>
              <div className="text-sm text-greydark">{u.email}{u.position ? ` · ${u.position}` : ""}</div>
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
            <button className="text-sm underline text-greydark" onClick={() => update(u.id, { active: !u.active })}>
              {u.active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

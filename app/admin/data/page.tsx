"use client";

import { useEffect, useState } from "react";
import CsvUpload from "@/components/CsvUpload";

export default function DataAdmin() {
  const [users, setUsers] = useState<any[]>([]);

  const load = () => fetch("/api/admin/staff").then((r) => r.json()).then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);


  const save = async (id: string, patch: any) => {
    await fetch("/api/admin/staff", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }),
    });
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Performance data</h1>
        <p className="text-sm text-greydark">
          Upload a CSV (from the Actionstep export, the targets Google Sheet, or the accountant) or
          edit values directly. Headers: email, salary, billable_target, billable_actual,
          revenue_target, revenue_actual, period. Salary is only ever visible to admins.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium">CSV upload</h2>
        <CsvUpload onDone={load} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border border-stone">
          <thead>
            <tr className="bg-ink text-white text-left">
              {["Name", "Salary", "Billable target", "Billable actual", "Revenue target", "Revenue actual", "Period"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter((u) => u.active).map((u) => (
              <tr key={u.id} className="border-t border-stone">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                {["salary", "billableTarget", "billableActual", "revenueTarget", "revenueActual"].map((f) => (
                  <td key={f} className="px-2 py-1">
                    <input className="input" type="number" defaultValue={u[f] ?? ""}
                      onBlur={(e) => save(u.id, { [f]: e.target.value })} />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <input className="input" defaultValue={u.dataPeriod ?? ""} placeholder="Jul 2025 - Jun 2026"
                    onBlur={(e) => save(u.id, { dataPeriod: e.target.value })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelReviewButton({ cycleId, name }: { cycleId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-sm underline text-greydark hover:text-ink"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Cancel ${name}'s review? Any draft answers they've saved will be deleted. You can start a fresh review any time from the Staff page.`)) return;
        setBusy(true);
        const res = await fetch(`/api/admin/cycles/${cycleId}`, { method: "DELETE" });
        setBusy(false);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error ?? "Could not cancel the review.");
          return;
        }
        router.refresh();
      }}
    >
      {busy ? "Cancelling..." : "Cancel"}
    </button>
  );
}

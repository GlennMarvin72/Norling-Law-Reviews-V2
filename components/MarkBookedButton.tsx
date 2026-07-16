"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkBookedButton({
  cycleId,
  label = "Mark meeting booked",
  confirmText = "Confirm the review meeting has been booked in the calendar?",
}: {
  cycleId: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-sm underline text-greydark hover:text-ink"
      disabled={busy}
      onClick={async () => {
        if (!confirm(confirmText)) return;
        setBusy(true);
        const res = await fetch(`/api/reflection/${cycleId}/booked`, { method: "POST" });
        setBusy(false);
        if (!res.ok) {
          alert("Couldn't save that - try again.");
          return;
        }
        router.refresh();
      }}
    >
      {busy ? "Saving..." : label}
    </button>
  );
}

"use client";

import { useRef, useState } from "react";

export default function CsvUpload({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setResults([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/data", { method: "POST", body: fd });
      let d: any = null;
      try {
        d = await res.json();
      } catch {
        setResults([`Upload failed (server returned ${res.status}). Try again, and check the Vercel logs if it persists.`]);
        return;
      }
      if (d.results) setResults(d.results);
      else if (d.error) setResults([d.error]);
      else setResults(["Upload finished but returned no detail."]);
      onDone();
    } catch (e: any) {
      setResults([`Upload failed: ${e?.message ?? "network error"}`]);
    } finally {
      setBusy(false);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button className="btn" disabled={!file || busy} onClick={upload}>
          {busy ? "Uploading..." : file ? `Upload ${file.name}` : "Upload"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="bg-stonelight p-3 text-sm space-y-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className={r.includes("skipped") || r.includes("failed") || r.includes("couldn't") ? "text-red-700" : "text-greydark"}>
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

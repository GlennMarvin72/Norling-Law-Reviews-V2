"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInInner() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Gold triangle motif */}
        <div className="flex gap-1.5 mb-8">
          {[5, 4, 3, 2, 1].map((n, row) => (
            <div key={row} className="flex flex-col gap-1.5">
              {Array.from({ length: n }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-gold"
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
              ))}
            </div>
          ))}
        </div>

        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          norling law<span className="text-gold">.</span>
        </h1>
        <p className="text-sm uppercase tracking-widest text-greydark mb-8">
          Annual Reviews
        </p>

        <div className="bg-white border border-stone p-8 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Welcome to the A-Team review space</h2>
            <p className="text-sm text-greydark leading-relaxed">
              This is where you complete your reflection ahead of your annual review
              conversation. Sign in with your Norling Law account to get started - your
              work saves automatically, so you can come back any time.
            </p>
          </div>

          {error && (
            <div className="bg-stonelight border-l-4 border-gold p-3 text-sm">
              Sign-in didn&apos;t complete{error !== "undefined" ? ` (${error})` : ""}. Give it
              another go, or contact Glenn if it keeps happening.
            </div>
          )}

          <button
            className="btn-gold w-full text-center"
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          >
            Sign in with your Norling Law account
          </button>

          <p className="text-xs text-greydark">
            Access is limited to current Norling Law staff via Microsoft sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}

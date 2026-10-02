"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * API keys are organization-scoped in SEM v2 (not per-namespace), so this
 * legacy route redirects to the global API Keys page.
 */
export default function LegacyKeysRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/apikeys");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to API Keys…
    </div>
  );
}

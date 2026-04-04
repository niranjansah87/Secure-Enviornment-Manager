"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "bg-[#111827] border border-zinc-800 text-zinc-100 shadow-xl",
            description: "text-zinc-400",
          },
        }}
      />
    </>
  );
}

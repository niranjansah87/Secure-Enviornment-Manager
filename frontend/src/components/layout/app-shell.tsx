"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { PageMotion } from "@/components/layout/page-motion";
import { useWorkspace } from "@/context/workspace-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { token } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // If mounted and no token is present, and we're not on the login or landing page, redirect.
    if (isMounted && !token && pathname !== "/login" && pathname !== "/") {
      router.push("/login");
    }
  }, [isMounted, token, pathname, router]);

  if (!isMounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19]">
      <div className="p-4 pr-2 h-full flex flex-col z-40">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pl-2">
        <AppHeader />
        <main className="flex flex-1 flex-col p-6">
          <PageMotion>{children}</PageMotion>
        </main>
      </div>
    </div>
  );
}

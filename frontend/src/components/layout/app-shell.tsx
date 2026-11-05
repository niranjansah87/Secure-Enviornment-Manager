"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { PageMotion } from "@/components/layout/page-motion";
import { ForceChangePassword } from "@/components/layout/force-change-password";
import { useWorkspace } from "@/context/workspace-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { token, mustChangePassword } = useWorkspace();
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
    <div className="flex h-screen overflow-hidden bg-[#07090e] selection:bg-blue-500/30">
      {mustChangePassword && <ForceChangePassword />}
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#07090e]">
        <AppHeader />
        <main data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-6">
          <PageMotion>{children}</PageMotion>
        </main>
      </div>
    </div>
  );
}


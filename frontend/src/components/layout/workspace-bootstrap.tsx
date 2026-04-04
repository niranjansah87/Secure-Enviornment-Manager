"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/context/workspace-context";

export function WorkspaceBootstrap({
  namespace,
  environment,
}: {
  namespace: string;
  environment: string;
}) {
  const { setWorkspace } = useWorkspace();

  useEffect(() => {
    setWorkspace({ namespace, environment });
  }, [namespace, environment, setWorkspace]);

  return null;
}

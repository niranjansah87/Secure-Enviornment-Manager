"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/context/workspace-context";

/**
 * Syncs the active workspace from the URL params of a `/[project]/[environment]`
 * route so the sidebar/header reflect where the user actually is.
 */
export function WorkspaceBootstrap({
  projectSlug,
  envSlug,
}: {
  projectSlug: string;
  envSlug: string;
}) {
  const { selectWorkspace, workspace } = useWorkspace();

  useEffect(() => {
    if (workspace?.projectSlug !== projectSlug || workspace?.envSlug !== envSlug) {
      selectWorkspace(projectSlug, envSlug);
    }
  }, [projectSlug, envSlug, selectWorkspace, workspace]);

  return null;
}

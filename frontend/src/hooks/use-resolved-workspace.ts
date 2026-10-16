"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/context/workspace-context";
import type { Environment, Project } from "@/lib/sem-api";

export type ResolvedWorkspace = {
  project: Project | null;
  environment: Environment | null;
  projectId: string | null;
  envId: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Resolves `/[projectSlug]/[envSlug]` URL params into the concrete
 * project/environment entities (and their UUIDs) the API needs.
 */
export function useResolvedWorkspace(projectSlug: string, envSlug: string): ResolvedWorkspace {
  const { projects, loadingProjects, environmentsFor } = useWorkspace();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const project = projects.find((p) => p.slug === projectSlug) ?? null;

  useEffect(() => {
    let active = true;

    if (loadingProjects) {
      setLoading(true);
      return;
    }
    if (!project) {
      setEnvironment(null);
      setError("Project not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    environmentsFor(project.id)
      .then((envs) => {
        if (!active) return;
        const env = envs.find((e) => e.slug === envSlug) ?? null;
        setEnvironment(env);
        setError(env ? null : "Environment not found");
      })
      .catch(() => {
        if (active) setError("Failed to load environment");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [project, envSlug, loadingProjects, environmentsFor]);

  return {
    project,
    environment,
    projectId: project?.id ?? null,
    envId: environment?.id ?? null,
    loading: loading || loadingProjects,
    error,
  };
}

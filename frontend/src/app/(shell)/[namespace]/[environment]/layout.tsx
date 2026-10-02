import { WorkspaceBootstrap } from "@/components/layout/workspace-bootstrap";

// The `[namespace]/[environment]` segments are the project slug and environment
// slug (e.g. /main/production). Kept as folder names to avoid a route rename.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace, environment } = await params;
  return (
    <>
      <WorkspaceBootstrap projectSlug={namespace} envSlug={environment} />
      {children}
    </>
  );
}

import { WorkspaceBootstrap } from "@/components/layout/workspace-bootstrap";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { namespace: string; environment: string };
}) {
  return (
    <>
      <WorkspaceBootstrap
        namespace={params.namespace}
        environment={params.environment}
      />
      {children}
    </>
  );
}

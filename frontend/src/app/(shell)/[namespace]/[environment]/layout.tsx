import { WorkspaceBootstrap } from "@/components/layout/workspace-bootstrap";

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
      <WorkspaceBootstrap
        namespace={namespace}
        environment={environment}
      />
      {children}
    </>
  );
}

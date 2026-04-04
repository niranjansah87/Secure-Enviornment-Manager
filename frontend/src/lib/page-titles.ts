export function pageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/projects") return "Projects";
  if (pathname === "/settings") return "Settings";
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const [, , ...rest] = parts;
    if (rest[0] === "compare") return "Compare environments";
    if (rest[0] === "history") return "Version history";
    if (rest[0] === "audit") return "Audit logs";
    if (rest[0] === "templates") return "Templates";
    return "Secrets";
  }
  return "Secure Environment Manager";
}

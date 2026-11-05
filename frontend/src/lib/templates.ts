/**
 * Starter environment templates.
 *
 * These are client-side scaffolds (not server-stored records): applying one
 * bulk-creates the listed keys with placeholder values the user then edits.
 * A real server-backed templates domain can replace this later without
 * changing the page — see the SEM backend audit notes.
 */

export type TemplateVar = { key: string; value: string; sensitive?: boolean; description?: string };

export type EnvTemplate = {
  id: string;
  name: string;
  description: string;
  category: "Framework" | "Database" | "Infrastructure" | "Service";
  variables: TemplateVar[];
};

export const TEMPLATES: EnvTemplate[] = [
  {
    id: "node",
    name: "Node.js service",
    description: "Common runtime variables for a Node.js backend.",
    category: "Framework",
    variables: [
      { key: "NODE_ENV", value: "production", description: "Runtime environment" },
      { key: "PORT", value: "3000", description: "Listen port" },
      { key: "LOG_LEVEL", value: "info" },
      { key: "SESSION_SECRET", value: "", sensitive: true, description: "Signing secret" },
    ],
  },
  {
    id: "nextjs",
    name: "Next.js app",
    description: "Public and server config for a Next.js frontend.",
    category: "Framework",
    variables: [
      { key: "NEXT_PUBLIC_API_URL", value: "https://api.example.com" },
      { key: "NEXT_PUBLIC_SITE_URL", value: "https://example.com" },
      { key: "NEXTAUTH_SECRET", value: "", sensitive: true },
      { key: "NEXTAUTH_URL", value: "https://example.com" },
    ],
  },
  {
    id: "django",
    name: "Django app",
    description: "Core settings for a Django project.",
    category: "Framework",
    variables: [
      { key: "DJANGO_SECRET_KEY", value: "", sensitive: true },
      { key: "DJANGO_DEBUG", value: "false" },
      { key: "DJANGO_ALLOWED_HOSTS", value: "example.com" },
      { key: "DATABASE_URL", value: "postgres://user:pass@host:5432/db", sensitive: true },
    ],
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Connection variables for a PostgreSQL database.",
    category: "Database",
    variables: [
      { key: "DATABASE_URL", value: "postgres://user:pass@host:5432/db", sensitive: true },
      { key: "PGHOST", value: "localhost" },
      { key: "PGPORT", value: "5432" },
      { key: "PGUSER", value: "postgres" },
      { key: "PGPASSWORD", value: "", sensitive: true },
      { key: "PGDATABASE", value: "app" },
    ],
  },
  {
    id: "redis",
    name: "Redis",
    description: "Connection variables for a Redis cache.",
    category: "Database",
    variables: [
      { key: "REDIS_URL", value: "redis://localhost:6379", sensitive: true },
      { key: "REDIS_TLS", value: "false" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Keys for Stripe payment integration.",
    category: "Service",
    variables: [
      { key: "STRIPE_SECRET_KEY", value: "sk_live_…", sensitive: true },
      { key: "STRIPE_PUBLISHABLE_KEY", value: "pk_live_…" },
      { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_…", sensitive: true },
    ],
  },
  {
    id: "aws",
    name: "AWS",
    description: "Credentials and region for AWS SDK access.",
    category: "Infrastructure",
    variables: [
      { key: "AWS_ACCESS_KEY_ID", value: "", sensitive: true },
      { key: "AWS_SECRET_ACCESS_KEY", value: "", sensitive: true },
      { key: "AWS_REGION", value: "us-east-1" },
      { key: "AWS_S3_BUCKET", value: "my-bucket" },
    ],
  },
  {
    id: "smtp",
    name: "SMTP email",
    description: "Outbound email server configuration.",
    category: "Service",
    variables: [
      { key: "SMTP_HOST", value: "smtp.example.com" },
      { key: "SMTP_PORT", value: "587" },
      { key: "SMTP_USER", value: "" },
      { key: "SMTP_PASSWORD", value: "", sensitive: true },
      { key: "SMTP_FROM", value: "noreply@example.com" },
    ],
  },
];

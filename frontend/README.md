<div align="center">

# 🖥️ Secure Environment Manager — Frontend UI (`frontend`)

### Next-Gen Developer Secrets Studio Built with Next.js 16, React 19 & Tailwind CSS v4

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000.svg?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Primitives-161618.svg)](https://www.radix-ui.com/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-0070F3.svg)](https://turbo.build/pack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 1. Overview

The `frontend` package is the redesigned web interface for **Secure Environment Manager (SEM)**. Engineered using **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**, it provides an obsidian-dark developer studio (`#07090E`) for secret management, cross-environment diffing, immutable audit exploration, and zero-trust authentication.

It connects over HTTPS and WebSockets to the centralized NestJS + Fastify backend API (`http://localhost:3001`).

---

## 2. Key Features & Workflows

### 🔐 Interactive Secrets Studio (`/[namespace]/[environment]`)
- **Zero-Flicker Secret Editing**: Add, update, or remove key-value pairs inline with instant optimistic UI feedback.
- **Reveal & Mask Controls**: Values remain masked by default; click-to-reveal temporarily reveals secret plaintext with automatic auto-mask timers.
- **Tagging & Comments**: Attach metadata, documentation, and tags to individual environment variables for team clarity.
- **Multi-Format Export**: Export environment configurations directly into `.env`, `JSON`, or `YAML` formats.

### 🔄 Visual Bulk `.env` Diffing Engine
- **Raw File Import**: Paste or drop raw `.env` files directly into the import modal.
- **Comment & Syntax Preservation**: Intelligently parses variables while keeping file structure intact.
- **Visual Diff Previews**: Color-coded side-by-side comparison showing new additions (green), modified values (amber), and unchanged variables (neutral) before confirming mutations.

### ⚖️ Cross-Environment Parity Matrix (`/[namespace]/[environment]/compare`)
- **Environment Drift Elimination**: Compare `development`, `staging`, and `production` configurations side-by-side in a unified table.
- **Discrepancy Highlighting**: Instantly flags missing keys or diverging values between release stages.

### 📜 Point-in-Time History & Snapshot Rollback (`/[namespace]/[environment]/history`)
- **Revision Timeline**: Chronological log of all secret changes with actor attribution and timestamps.
- **Snapshot Creation**: Capture immutable point-in-time environment snapshots before risky deployments.
- **One-Click Rollback**: Revert an entire environment back to any historical snapshot atomically.

### 🛡️ Real-Time Audit Log Explorer (`/[namespace]/[environment]/audit`)
- **Actor-Attributed Trail**: Filterable event log recording user identity, action type (`SECRET_REVEAL`, `SECRET_UPDATE`, `SNAPSHOT_RESTORE`), IP address, and timestamp.
- **Payload Inspection**: Expandable audit entries revealing metadata and mutation contexts.

### 🧩 Template Variable Interpolation (`/[namespace]/[environment]/templates`)
- **Modular Secrets**: Reference shared variables across secrets using `${VARIABLE_NAME}` syntax (e.g. `DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`).

### 🔑 Machine API Key Manager (`/apikeys`)
- **Scoped Tokens**: Generate machine tokens (`sem_<id>_<secret>`) for CI/CD pipelines, Docker containers, and microservices with granular permission scopes (`read`, `write`, `admin`).
- **Instant Revocation**: Revoke compromised tokens with one click.

### 👥 User & RBAC Administration (`/admin/users`)
- **Team Access Control**: Invite team members, assign organizational roles (`Admin`, `Developer`, `Viewer`), and inspect active login sessions.

---

## 3. Technology Stack & Design System

- **Framework**: [Next.js 16.4](https://nextjs.org/) (App Router, Standalone build output)
- **Runtime**: [React 19](https://react.dev/) (Server & Client Components)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/postcss`
- **UI Components**: [Radix UI Primitives](https://www.radix-ui.com/) (Dialog, Dropdown Menu, Tooltip, Scroll Area)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/) toast system
- **Data Tables**: [TanStack React Table v9](https://tanstack.com/table)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Theme Palette**: Obsidian Slate (`#07090E` background, `#0E121B` card surface, `#6366F1` indigo accents)

---

## 4. Directory Structure

```text
frontend/src/
├── app/
│   ├── (shell)/
│   │   └── [namespace]/
│   │       └── [environment]/
│   │           ├── page.tsx        # Secrets studio & key-value editor
│   │           ├── audit/          # Real-time audit log explorer
│   │           ├── compare/        # Cross-environment diff matrix
│   │           ├── history/        # Revision timeline & snapshot rollback
│   │           ├── settings/       # Environment configuration & KEK status
│   │           └── templates/      # Variable interpolation templates
│   ├── admin/                      # User & team RBAC management
│   ├── apikeys/                    # Scoped API key generator
│   ├── dashboard/                  # Executive metrics & project cards
│   ├── login/                      # Argon2id zero-trust login screen
│   ├── layout.tsx                  # Global root layout & font loading
│   └── page.tsx                    # Modern landing page
├── components/                     # Radix UI modals, diff viewers, forms
├── context/
│   └── workspace-context.tsx       # Global tenant state, token refresh, sessions
└── lib/
    ├── api.ts                      # Fastify REST & WebSocket client
    ├── bulk-diff.ts                # Visual .env parsing & diff calculation
    ├── error-translation.ts        # Resilient HTTP error mapping to sonner toasts
    └── logger.ts                   # Client-side telemetry logger
```

---

## 5. Client Architecture & State Management

### A. `WorkspaceContext`
The application state is centralized in `src/context/workspace-context.tsx`:
- Manages the active organization tenant (`orgId`), current project, and environment.
- Handles transparent ES256 JWT access token caching and refresh token rotation with the `/api/v1/auth/refresh` endpoint.
- Persists user preferences and active environment selections across navigation.

### B. Error Handling & Translation
All backend HTTP errors and network timeouts are routed through `src/lib/error-translation.ts`:
- Automatically translates status codes (e.g. `401 Unauthorized`, `403 Forbidden`, `429 Rate Limited`, `500 Server Error`) into human-readable, contextual error descriptions.
- Delivers feedback via non-blocking Sonner toasts.

### C. Real-Time Synchronization
The UI establishes a WebSocket connection to `@sem/api` upon login:
- Listens for secret mutation events (`secret.created`, `secret.updated`, `secret.deleted`).
- Automatically refreshes the secret list and audit stream across open browser tabs without manual page reload.

---

## 6. Environment Configuration

Create a `.env.local` file in the `frontend/` directory (or use root `.env`):

```ini
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# WebSocket Gateway URL
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## 7. Development & Testing Commands

```bash
# 1. Install dependencies from workspace root
pnpm install

# 2. Start Next.js development server with Turbopack
pnpm dev

# 3. Typecheck with TypeScript
pnpm typecheck

# 4. Lint with ESLint 10
pnpm lint

# 5. Execute frontend unit tests (bulk diff & error translation)
pnpm test:unit

# 6. Build optimized standalone production output
pnpm build

# 7. Start production standalone server
pnpm start
```

---

## 8. Docker Deployment

The frontend includes a multi-stage, non-root Alpine `Dockerfile` optimized for Next.js standalone output:

```bash
# Build standalone container image
docker build -t sem-frontend:latest ./frontend

# Or run via root Docker Compose
docker compose up frontend -d
```

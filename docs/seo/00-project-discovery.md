# 00 — Project & Business Discovery: Secure Environment Manager (SEM)

**Document Code:** `SEO-PHASE-00`  
**Target System:** Secure Environment Manager (SEM V2)  
**Production Host:** `https://sem.niranjansah87.com.np`  
**Creator / Architect:** Niranjan Sah (`https://niranjansah87.com.np`)  
**Audit Date:** October 2026  
**Auditor:** Principal Technical SEO Architect & Search Intelligence Team  

---

## 1. Executive Summary & Identity

**Secure Environment Manager (SEM)** is an enterprise-grade, open-source, self-hosted secrets management and environment variable synchronization platform. SEM addresses the acute security and compliance risks associated with decentralized `.env` files, unencrypted chat-based credentials sharing, and cumbersome legacy key-vault configurations.

Built as a lightweight, zero-knowledge, developer-first alternative to heavy proprietary solutions (e.g., HashiCorp Vault, Doppler, Infisical, AWS Secrets Manager), SEM guarantees full data sovereignty: data never leaves the customer's on-premise or cloud infrastructure.

### 1.1 Business & Project Discovery Matrix

| Discovery Vector | Assessment & Findings | Source Reference |
| :--- | :--- | :--- |
| **Product Name** | Secure Environment Manager (SEM / SEM V2) | `README.md:1`, `docs/architecture.md:3` |
| **Industry / Niche** | Cybersecurity, Secrets Management, DevOps, Cloud Infrastructure | `README.md:3-14` |
| **Business Model** | Open-source Core (MIT License) with Enterprise Self-Hosted readiness | `frontend/src/app/page.tsx:728`, `LICENSE` |
| **Primary Audience** | DevOps Engineers, Site Reliability Engineers (SRE), Platform Architects, Tech Leads | `docs/introduction.md:38-44` |
| **Secondary Audience**| Full-Stack Developers, Security Auditors, Compliance Officers, Solo Founders | `frontend/src/app/page.tsx:60-86` |
| **Revenue Model** | Developer adoption funnel: Open source download → Enterprise support / commercial licensing | `packages/sdk/`, `frontend/src/app/login/page.tsx` |
| **Geographic Markets** | Global (English primary: `en_US`), Developer hubs (US, EU, APAC, India, Nepal) | `frontend/src/app/layout.tsx:54` |
| **Core Problem Solved**| Leaked API keys, `.env` file chaos, missing audit trails, hardcoded git secrets | `docs/introduction.md:5-15` |
| **Key Differentiator** | 3-tier AES-256-GCM Envelope Encryption (`MEK` → `KEK` → `DEK`) with AAD tampering defense | `packages/crypto/src/`, `docs/architecture.md:23-27` |
| **Delivery Channels** | Next.js 15 Web Console, Headless CLI (`sem`), TypeScript SDK (`@sem/sdk`), REST API | `README.md:16-31`, `frontend/src/app/docs/page.tsx` |

---

## 2. Technical Stack & Repository Investigation

### 2.1 Repository Architecture

The repository is structured as a high-performance monorepo using **pnpm 9** and **Turborepo**:

*   **Frontend Web Console (`frontend/`)**: Next.js 15.5.28 (React 19.3), Tailwind CSS, Framer Motion 12, Three.js 3D visualizers, Lucide icons. Serves public landing page, interactive technical documentation, and the authenticated management dashboard.
*   **Backend API (`backend/`, `@sem/api`)**: NestJS 10 running on Fastify HTTP adapter (port 3001) for low-latency JSON throughput. Enforces multi-tenant organization isolation at the Drizzle ORM query layer.
*   **Cryptographic Core (`packages/crypto/`, `@sem/crypto`)**: Dedicated zero-dependency cryptographic module implementing NIST SP 800-38D AES-256-GCM envelope encryption.
*   **TypeScript SDK (`packages/sdk/`, `@sem/sdk`)**: Runtime client library for programmatic secrets resolution in application runtimes.
*   **Background Worker (`worker/`, `@sem/worker`)**: BullMQ queue processor backed by Redis 7 for background crypto rotation and audit rollups.
*   **Database & Persistence**: PostgreSQL 16 managed via Drizzle ORM schemas with append-only audit event logging.
*   **Reverse Proxy & Edge**: Nginx / Caddy edge proxy terminating TLS and routing to Next.js (`:3000`) and NestJS (`:3001`).

### 2.2 Rendering Architecture Analysis

| Route / Surface | Technology | Rendering Paradigm | Search Engine Implication |
| :--- | :--- | :--- | :--- |
| **Homepage (`/`)** | Next.js App Router | Client Component (`"use client"`) inside Server Root Layout | Server emits initial HTML layout, but interactive 3D components require client hydration. Crucial semantic text must be crawlable in SSR pass. |
| **Docs (`/docs`)** | Next.js App Router | Client Component (`"use client"`) | Lacks dedicated Server Layout/Metadata export; metadata currently falls back to Root Layout defaults without distinct title, canonical, or tech article schema. |
| **Login (`/login`)** | Next.js App Router | Client Component (`"use client"`) | Utility authentication page; indexed by default, but should be canonicalized and structured as an administrative entrypoint. |
| **Dashboard / Shell (`/[namespace]/...`)** | Next.js App Router | Protected Client App (`WorkspaceProvider`) | Private, authenticated application space. Must be strictly disallowed in `robots.txt` and excluded from sitemaps to prevent index bloat and crawler budget wastage. |

---

## 3. Public Route Inventory & Indexation Strategy

Every route across the codebase was cataloged and evaluated for search value:

```
Public & Indexable (High Search Value):
├── / (Homepage) — Primary commercial & brand discovery page
└── /docs (Technical Documentation) — Comprehensive developer & cryptographic guide

Public Utility (Controlled Indexation):
└── /login (Console Login) — Low search intent; retain noindex/follow or minimal canonical indexation

Private Authenticated (Strict NOINDEX & Robot Disallow):
├── /dashboard
├── /projects
├── /apikeys
├── /analytics
├── /admin/*
├── /[namespace]/*
├── /[namespace]/[environment]/*
│   ├── /audit
│   ├── /compare
│   ├── /history
│   ├── /keys
│   ├── /settings
│   └── /templates
└── /api/*
```

---

## 4. Existing SEO Implementation Assessment

An inspection of `frontend/src/app/layout.tsx`, `robots.ts`, `sitemap.ts`, and `public/` revealed:

1.  **Metadata Foundation**: Clean `metadataBase` configured to `https://sem.niranjansah87.com.np` with base OpenGraph, Twitter, and Favicon assets.
2.  **Severe Robots Exclusion Flaw**: `frontend/src/app/robots.ts` includes `'/*/'` in its `disallow` array. In Google robots standard parsing, wildcard slash matching can inadvertently block nested documentation sub-anchors and crawler exploration.
3.  **Missing Documentation in Sitemap**: `frontend/src/app/sitemap.ts` currently enumerates only `/` and `/login`. The high-authority `/docs` page (containing over 1,200 lines of rich technical guides, threat models, CLI instructions, and cryptographic proofs) is **completely omitted** from the XML sitemap.
4.  **Client-Side Docs Metadata Vacuum**: Because `frontend/src/app/docs/page.tsx` is declared with `"use client"`, it cannot export server metadata directly. It inherits the generic site title without dedicated doc title, descriptions, or `TechArticle` structured data.
5.  **Outdated AI Search Directives (`llms.txt`)**: `frontend/public/llms.txt` and `llms-full.txt` still describe the legacy Python/Fernet V1 architecture instead of V2's NestJS/Fastify/AES-256-GCM envelope encryption.

---

## 5. Stakeholder Discovery & Conversion Architecture

*   **Primary Conversion Goal**: Developer adoption (GitHub stars, repository cloning, Docker Compose deployment, CLI installation via `npm install -g @sem/cli` / `pnpm`).
*   **Secondary Conversion Goal**: Platform exploration (reading docs, understanding zero-knowledge security guarantees, signing into demo / local instance).
*   **Brand Entity Anchor**: "Secure Environment Manager" (Brand) + "Niranjan Sah" (Author & Software Architect).

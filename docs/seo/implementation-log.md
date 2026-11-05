# Implementation Log — Search Growth Engineering

**Document Code:** `SEO-IMPLEMENTATION-LOG`  
**System:** Secure Environment Manager (SEM)  
**Execution Date:** October 2026  
**Status:** In Progress / Completed Verification  

---

## 1. Implementation Chronicle

### Log Entry 01: Critical Robots Directive Overhaul
*   **Target File:** `frontend/src/app/robots.ts`
*   **Issue Ref:** `TECH-01`
*   **Action Taken:**
    *   Removed hazardous `'/*/'` wildcard that caused crawler blocks across subdirectories.
    *   Added explicit `allow` paths for `/`, `/docs`, `/login`, static Next.js assets (`/_next/static/`), and branding icons.
    *   Added dedicated user-agent allowances for modern AI search and retrieval crawlers (`Googlebot`, `bingbot`, `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Applebot`).
    *   Explicitly blocked aggressive non-search training scrapers (`Bytespider`, `CCBot`) to conserve production bandwidth.
*   **Result:** Crawl paths to documentation and public assets are completely unblocked and clearly defined.

### Log Entry 02: XML Sitemap Expansion
*   **Target File:** `frontend/src/app/sitemap.ts`
*   **Issue Ref:** `TECH-02`
*   **Action Taken:**
    *   Added `https://sem.niranjansah87.com.np/docs` to the sitemap array with priority `0.9` and weekly update frequency.
    *   Updated priority weighting (`/` at `1.0`, `/docs` at `0.9`, `/login` at `0.5`).
    *   Set dynamic `lastModified: new Date()`.
*   **Result:** High-value documentation hub is officially indexed for priority crawler visits.

### Log Entry 03: Server-Side Metadata & Structured Data for `/docs`
*   **Target File:** `frontend/src/app/docs/layout.tsx` (New Server Component)
*   **Issue Ref:** `TECH-03`
*   **Action Taken:**
    *   Created `frontend/src/app/docs/layout.tsx` to wrap the client-side docs page.
    *   Exported dedicated `Metadata` with target title *"Documentation & Developer Architecture | Secure Environment Manager"*, keyword-rich description, and explicit canonical URL.
    *   Embedded Schema.org `TechArticle` and `BreadcrumbList` JSON-LD linked to author Niranjan Sah and the organization entity.
*   **Result:** Eliminates metadata inheritance from the homepage, establishes unique snippet representation in SERPs, and provides rich article schema.

### Log Entry 04: Sitewide Structured Data Expansion & Canonical Anchors
*   **Target File:** `frontend/src/app/layout.tsx`
*   **Issue Ref:** `TECH-05`
*   **Action Taken:**
    *   Added canonical link definition `alternates: { canonical: "https://sem.niranjansah87.com.np/" }`.
    *   Expanded JSON-LD to multi-entity `@graph` containing `SoftwareApplication` (v2.0.0, MIT license, features, offers), `Organization`, and `Person` (Niranjan Sah, sameAs links).
*   **Result:** Establishes clear entity relationships in Google Knowledge Graph and AI search engines.

### Log Entry 05: Generative Engine Documentation Manifest Synchronization
*   **Target Files:** `frontend/public/llms.txt`, `frontend/public/llms-full.txt`
*   **Issue Ref:** `TECH-06`
*   **Action Taken:**
    *   Rewrote legacy V1 references (Fernet AES-256-CBC, SQLite/disk files, Flask port 8070).
    *   Synchronized with V2 architecture: NestJS + Fastify (port 3001), PostgreSQL 16 + Drizzle ORM, BullMQ + Redis 7, AES-256-GCM envelope encryption (MEK → KEK → DEK), and Headless CLI (`sem`).
*   **Result:** LLMs, Perplexity, and ChatGPT search agents ingest 100% accurate, authoritative architectural facts.


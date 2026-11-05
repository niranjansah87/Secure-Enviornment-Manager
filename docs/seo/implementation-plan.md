# Implementation Plan & Prioritized Search Engineering Roadmap

**Document Code:** `SEO-IMPLEMENTATION-PLAN`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Execution Methodology:** Risk-Scored, Dependency-Ordered Technical Deployment  

---

## 1. Prioritization Framework

Tasks are ranked across 6 dimensions:
1.  **Severity (Critical / High / Medium / Low)**
2.  **Search & Business Impact (1–10)**
3.  **Implementation Effort (Low / Medium / High)**
4.  **Risk to Existing Functionality (Low / Medium / High)**
5.  **Technical Dependencies**
6.  **Verification Protocol**

---

## 2. Master Implementation Roadmap

| Priority | Task ID | Description & Action | Target Files | Effort | Impact | Risk | Validation Method |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **P0** | `TASK-01` | **Fix `robots.ts` Wildcard Exclusion:** Remove hazardous `'/*/'` pattern; add explicit allow for `/` and `/docs`; add dedicated crawler rules for search & AI agents. | `frontend/src/app/robots.ts` | Low | 10/10 | Low | Next.js build & robots.txt route inspection |
| **P0** | `TASK-02` | **Include `/docs` in XML Sitemap:** Add high-priority entry for `/docs` with proper change frequency and lastModified date. | `frontend/src/app/sitemap.ts` | Low | 9/10 | Low | Next.js build & sitemap.xml route inspection |
| **P0** | `TASK-03` | **Create Dedicated Server Metadata for `/docs`:** Implement `frontend/src/app/docs/layout.tsx` (Server Component) with rich titles, descriptions, canonicals, OpenGraph, and `TechArticle` / `BreadcrumbList` JSON-LD. | `frontend/src/app/docs/layout.tsx` | Medium | 9/10 | Low | Next.js build & HTML metadata check |
| **P1** | `TASK-04` | **Synchronize `llms.txt` & `llms-full.txt` with V2 Architecture:** Update manifest from legacy V1 Python/Fernet to NestJS/Fastify, AES-256-GCM envelope encryption, and TypeScript SDK. | `frontend/public/llms.txt`, `llms-full.txt` | Medium | 8/10 | Low | Text diff & AI parsing verification |
| **P1** | `TASK-05` | **Enrich Root Layout Structured Data:** Expand `SoftwareApplication` JSON-LD in `layout.tsx` with version 2.0.0, license, features, and author entity reference (`Person` Niranjan Sah). | `frontend/src/app/layout.tsx` | Low | 8/10 | Low | Schema.org syntax check |
| **P2** | `TASK-06` | **Optimize Static Cache Headers & Image Delivery in `next.config.mjs`:** Ensure immutable static asset caching and clean canonical security headers. | `frontend/next.config.mjs` | Medium | 7/10 | Low | Build verification & HTTP headers check |
| **P2** | `TASK-07` | **Automated Type & Production Build Verification:** Run full monorepo typecheck and Next.js production build to verify 0 regressions. | Workspace root | Medium | 10/10 | Low | `pnpm --filter frontend build` |

---

## 3. Dependency & Risk Analysis

*   **Zero Breaking Changes:** None of the proposed changes modify backend database schemas, encryption algorithms, API token contracts, or authenticated shell routes (`(shell)/`).
*   **Decoupled Server/Client Metadata:** Creating `frontend/src/app/docs/layout.tsx` enables full Server-Side Rendering (SSR) of metadata while preserving all existing client-side interactivity, search filtering, and state inside `frontend/src/app/docs/page.tsx` (`"use client"`).


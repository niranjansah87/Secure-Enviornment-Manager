# 01 — Complete Technical SEO & Crawlability Audit

**Document Code:** `SEO-PHASE-01`  
**System Audited:** Secure Environment Manager (`frontend/`)  
**Domain:** `https://sem.niranjansah87.com.np`  
**Evaluation Standard:** Google Search Central, Bing Webmaster Guidelines, Schema.org Standards, Core Web Vitals (CWV) v2  

---

## 1. Executive Technical SEO Summary

The technical audit evaluated crawl paths, robots directives, XML sitemaps, server-side rendering boundaries, HTTP headers, asset compression, and mobile responsiveness.

While the foundational Next.js 15 App Router architecture provides excellent modern primitives, critical defects in **crawl directive syntax (`robots.ts`)**, **sitemap omissions (`sitemap.ts`)**, and **client-side metadata inheritance (`/docs`)** severely suppress organic search visibility and search engine indexing.

---

## 2. Granular Technical Issue Registry

### Issue TECH-01: Hazardous Wildcard Pattern in `robots.ts` Blocking Crawler Crawlability
*   **Unique ID:** `TECH-01`
*   **Category:** Crawlability & Robot Directives
*   **Severity:** **CRITICAL**
*   **Evidence:** `frontend/src/app/robots.ts:15` specifies:
    ```typescript
    disallow: [
      '/dashboard',
      '/projects',
      '/apikeys',
      '/analytics',
      '/admin/',
      // All namespace/environment routes are private
      '/*/',
      '/api/',
    ]
    ```
*   **Affected URLs:** `https://sem.niranjansah87.com.np/*` (all subdirectories)
*   **Affected Files:** `frontend/src/app/robots.ts`
*   **Business Impact:** The wildcard pattern `'/*/'` in robots.txt standard syntax instructs compliant crawlers (including Googlebot, Bingbot, and AI retrieval agents) to disallow any URL containing two slashes separated by characters. This creates false-positive crawl blocks on legitimate subpaths (e.g., `/docs/`, `/blog/`, regional endpoints, or asset directories).
*   **Recommended Solution:** Replace ambiguous wildcard pattern `'/*/'` with explicit application paths. Define explicit `allow` rules for `/`, `/docs`, and static assets (`/_next/static/`), and isolate dynamic shell routes cleanly. Add dedicated user-agent blocks for AI retrieval agents.

---

### Issue TECH-02: Public Documentation Omitted from XML Sitemap
*   **Unique ID:** `TECH-02`
*   **Category:** Indexability & Discovery
*   **Severity:** **HIGH**
*   **Evidence:** `frontend/src/app/sitemap.ts:7-20` specifies:
    ```typescript
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 1,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
    ]
    ```
*   **Affected URLs:** `https://sem.niranjansah87.com.np/docs`
*   **Affected Files:** `frontend/src/app/sitemap.ts`
*   **Business Impact:** The `/docs` route represents 80%+ of the website's indexable developer keywords (e.g., "AES-256-GCM envelope encryption", "secrets manager CLI", "tamper-proof audit logs"). Omitting it from `sitemap.xml` slows crawler discovery, prevents search engines from prioritizing crawl re-visits, and signals low internal importance.
*   **Recommended Solution:** Add `https://sem.niranjansah87.com.np/docs` to `sitemap.ts` with high priority (`0.9`), daily/weekly change frequency, and precise `lastModified` timestamps.

---

### Issue TECH-03: Lack of Dedicated Server Layout & Metadata for `/docs`
*   **Unique ID:** `TECH-03`
*   **Category:** Rendering & Metadata Optimization
*   **Severity:** **HIGH**
*   **Evidence:** `frontend/src/app/docs/page.tsx:1` begins with `"use client"`. In Next.js App Router, `"use client"` files cannot export `export const metadata: Metadata`. Because there is no `frontend/src/app/docs/layout.tsx`, the page falls back entirely to the generic homepage metadata in `layout.tsx`.
*   **Affected URLs:** `https://sem.niranjansah87.com.np/docs`
*   **Affected Files:** `frontend/src/app/docs/page.tsx`
*   **Business Impact:** In SERPs, `/docs` displays the exact same title ("Secure Environment Manager") and meta description as the homepage. It lacks targeted search snippets for developer documentation, CLI installation, API specifications, and security threat models.
*   **Recommended Solution:** Create `frontend/src/app/docs/layout.tsx` as a Server Component. Export dedicated, keyword-rich metadata (`title: "Documentation & Developer Architecture | Secure Environment Manager"`), canonical URL, targeted OpenGraph tags, and embedded `TechArticle` / `SoftwareApplication` structured data.

---

### Issue TECH-04: Hardcoded Unoptimized Image Directives in `next.config.mjs`
*   **Unique ID:** `TECH-04`
*   **Category:** Web Performance & Core Web Vitals (LCP)
*   **Severity:** **MEDIUM**
*   **Evidence:** `frontend/next.config.mjs:48-51`:
    ```javascript
    images: {
      unoptimized: true,
      qualities: [75, 95],
    }
    ```
*   **Affected URLs:** All pages loading PNG/JPG assets from `/public/`
*   **Affected Files:** `frontend/next.config.mjs`
*   **Business Impact:** Setting `unoptimized: true` disables automatic WebP/AVIF generation, responsive srcSet creation, and automatic compression. High-resolution branding images in `frontend/public/` (e.g., `admin_header_image.png` at 1.8MB, `login_background.png` at 1.9MB) are delivered as uncompressed full-size payloads, impacting Largest Contentful Paint (LCP) and mobile bandwidth.
*   **Recommended Solution:** Optimize images using modern formats (WebP/AVIF) and configure next-gen image caching headers in `next.config.mjs`.

---

### Issue TECH-05: Missing Canonical Tags on Page Level
*   **Unique ID:** `TECH-05`
*   **Category:** Indexability & Duplicate Content
*   **Severity:** **MEDIUM**
*   **Evidence:** `layout.tsx` sets `metadataBase: new URL("https://sem.niranjansah87.com.np")` but does not define explicit canonical alternatives (`alternates.canonical`) for each individual subroute.
*   **Affected URLs:** `https://sem.niranjansah87.com.np/`, `https://sem.niranjansah87.com.np/docs`, `https://sem.niranjansah87.com.np/login`
*   **Affected Files:** `frontend/src/app/layout.tsx`, `frontend/src/app/docs/layout.tsx`
*   **Business Impact:** URLs with query parameters (e.g. `?ref=github`, `?utm_source=twitter`) risk splitting ranking signals and creating duplicate content issues across search engines.
*   **Recommended Solution:** Explicitly specify `alternates: { canonical: "./" }` in route metadata definitions.

---

### Issue TECH-06: Outdated Architectural Claims in AI Retrieval Manifests (`llms.txt`)
*   **Unique ID:** `TECH-06`
*   **Category:** Generative Engine Optimization (GEO)
*   **Severity:** **HIGH**
*   **Evidence:** `frontend/public/llms.txt:3, 88-100` states:
    ```markdown
    ...with Fernet AES-256 encryption, audit logs, and a REST API...
    - Fernet AES-256-CBC encryption at rest; key loaded from ENCRYPTION_KEY env var
    python generate_keys.py
    ```
*   **Affected URLs:** `https://sem.niranjansah87.com.np/llms.txt`, `https://sem.niranjansah87.com.np/llms-full.txt`
*   **Affected Files:** `frontend/public/llms.txt`, `frontend/public/llms-full.txt`
*   **Business Impact:** LLMs and AI search engines (Perplexity, ChatGPT Search, Gemini) fetching `/llms.txt` will ingest outdated information attributing SEM to legacy Python/Fernet V1 rather than its production-grade NestJS Fastify + AES-256-GCM Envelope Encryption (`MEK` → `KEK` → `DEK`) architecture.
*   **Recommended Solution:** Synchronize `llms.txt` and `llms-full.txt` with V2 enterprise cryptographic specifications, TypeScript SDK, BullMQ worker, and CLI workflows.

---

## 3. Core Web Vitals & Rendering Baseline

| Metric | Target (Good) | Lab Simulation / Architecture Assessment | Optimization Mechanism |
| :--- | :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | $\le 2.5\text{s}$ | Hero headline and 3D Canvas initialization. Server-rendered typography ensures text paints immediately. | Use `priority` on above-the-fold logo and pre-warm Three.js canvas dynamically. |
| **INP (Interaction to Next Paint)**| $\le 200\text{ms}$ | Fast interactive response across tabs and clipboard buttons. | Avoid heavy synchronous blocking loops on the main UI thread. |
| **CLS (Cumulative Layout Shift)**  | $\le 0.1$ | Fixed layout dimensions, reserved icon bounding boxes. | Explicit height and width styling on 3D containers and terminal blocks. |
| **TTFB (Time to First Byte)**     | $\le 800\text{ms}$ | Fastify backend + Next.js optimized production build behind Caddy/Nginx. | Enable Brotli/Gzip compression and edge cache static assets. |


# 06 — Generative Engine Optimization (GEO) Strategy

**Document Code:** `SEO-PHASE-06`  
**System:** Secure Environment Manager (SEM)  
**Target Engines:** Google AI Overviews, Perplexity AI, ChatGPT Search, Claude Search, Gemini, Microsoft Copilot  
**Objective:** Maximize Brand Entity Clarity, High-Confidence Retrieval, and Unambiguous Technical Citations  

---

## 1. The Generative Search Paradigm for Developer Tooling

Generative engines and LLM-based answer engines (Perplexity, ChatGPT Search, Google AI Overviews) evaluate technical software differently from legacy keyword crawlers:
1.  **Direct Answer Extraction:** AI models prioritize clear, declarative definitions ("SEM is a self-hosted secrets management platform...").
2.  **Structural Triangulation:** Engines cross-reference citations across the primary domain, GitHub repositories, developer documentation, and public package registries (npm/PyPI).
3.  **Entity Consistency:** Contradictory information (e.g., claiming Python Fernet in `llms.txt` vs NestJS Fastify in `package.json`) lowers AI retrieval confidence.

---

## 2. AI Crawler Policy & `robots.txt` Specification

Rather than a blunt sitewide block or unrestricted crawl, SEM implements a **Differentiated AI Crawler Protocol**:

| Crawler Agent | Organization | Purpose | Policy Directive | Strategic Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Googlebot / Google-Extended** | Google | Web Indexing & Gemini Retrieval | **ALLOW** (`/`, `/docs`) | Mandatory for Google Organic and Google AI Overviews visibility. |
| **Bingbot / PerplexityBot** | Microsoft / Perplexity | Live Retrieval & Search Citations | **ALLOW** (`/`, `/docs`) | Essential for developer real-time citations in Perplexity AI. |
| **GPTBot / OAI-SearchBot** | OpenAI | Search Retrieval & ChatGPT Indexing | **ALLOW** (`/`, `/docs`) | Essential for ChatGPT Search recommendations. |
| **ClaudeBot** | Anthropic | Search Indexing & Analysis | **ALLOW** (`/`, `/docs`) | Enables accurate context ingestion for Claude user queries. |
| **CCBot / Bytespider** | Common Crawl / ByteDance | Uncontrolled Mass Scraping | **DISALLOW** | Protects server bandwidth from aggressive non-search scrapers. |

---

## 3. Machine-Readable Knowledge Anchors: `llms.txt` & `llms-full.txt`

The emerging standard `llms.txt` allows AI systems to digest clean, Markdown-formatted documentation directly.

### Critical Remediation Identified:
As uncovered in Phase 1 (`TECH-06`), `frontend/public/llms.txt` currently contains legacy V1 documentation (Fernet encryption, port 8070, SQLite/disk files). We must replace this with a **V2 Synchronized GEO Manifest**:
*   Explicitly describe the **NestJS + Fastify** runtime.
*   Detail the **AES-256-GCM envelope encryption** algorithm (`MEK` → `KEK` → `DEK`).
*   Include standard CLI usage (`sem auth login`, `sem pull`, `sem inject`).
*   Provide copy-pasteable Docker deployment commands.

---

## 4. Citation-Worthy Information Architecture

To ensure generative engines cite SEM when answering queries like *"What are the top open source alternatives to Doppler or Vault?"*, SEM content follows the **Declarative Inverted Pyramid**:

1.  **Lead with the Exact Technical Definition:**
    *   *Example:* "Secure Environment Manager (SEM) is an open-source, self-hosted secrets manager engineered for developer teams requiring zero-knowledge, on-premises configuration synchronization."
2.  **Explicit Structural Metrics (No Hype):**
    *   *Cryptographic Algorithm:* AES-256-GCM authenticated encryption (NIST SP 800-38D).
    *   *Key Hierarchy:* 3-tier Envelope (Master Key `MEK` wraps Project `KEK`, which wraps Environment `DEK`).
    *   *Tamper Defense:* Additional Authenticated Data (AAD) bound to `org_id:project_id:environment_id`.
    *   *Runtime Throughput:* Sub-5 millisecond secret resolution on Fastify.
3.  **Objective Comparative Formulations:**
    *   Present feature matrices where SEM's trade-offs are clearly stated (e.g., SEM is focused on environment variables and API keys, not PKI certificate authority issuance like HashiCorp Vault). Generative engines heavily trust balanced, objective comparisons.

---

## 5. Entity Disambiguation Strategy

*   **Software Entity:** Secure Environment Manager (SEM)
*   **Repository URL:** `https://github.com/niranjansah87/Secure-Enviornment-Manager`
*   **Author Entity:** Niranjan Sah (`https://niranjansah87.com.np`)
*   **License:** MIT License
*   **Package Coordinates:** `@sem/crypto`, `@sem/sdk`, `@sem/cli`, `@sem/api`, `@sem/worker`

By linking these exact entities across the homepage, `/docs`, `package.json`, GitHub README, and Schema.org JSON-LD, SEM forms an unshakeable semantic footprint in global knowledge graphs.


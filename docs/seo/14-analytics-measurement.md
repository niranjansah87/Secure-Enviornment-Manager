# 14 — Search Intelligence, Analytics & KPI Measurement Framework

**Document Code:** `SEO-PHASE-14`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Measurement Disciplines:** Organic Search Metrics, AI Referral Attribution, Developer Conversion Tracking  

---

## 1. Search Intelligence Tooling Stack

To track search engine indexation, query performance, and user engagement while upholding developer privacy:

1.  **Google Search Console (GSC):**
    *   *Verification Method:* DNS TXT record on domain `niranjansah87.com.np`.
    *   *Monitored Properties:* `https://sem.niranjansah87.com.np/` (URL prefix and Domain property).
    *   *Primary Reports:* Index Coverage (monitoring 0-error status across `/` and `/docs`), Performance (Queries, Pages, CTR, Impressions).
2.  **Bing Webmaster Tools:**
    *   *Integration:* GSC verification import.
    *   *IndexNow Protocol:* Automatic instantaneous notification of updated URLs to Bing and Yandex crawlers.
3.  **Privacy-First Web Analytics (Self-Hosted / Cookieless):**
    *   Zero creepy cross-site tracking cookies.
    *   Event logging for high-value actions (Copy Docker command, View Docs, Click GitHub Link).

---

## 2. Core KPI Hierarchy

### 2.1 Search Engine Performance KPIs
*   **Total Impressions & Click Volume:** Monthly trajectory of organic impressions across core clusters.
*   **Average SERP Position:** Tracking top-10 positions for `"self-hosted secrets manager"` and `"envelope encryption secrets"`.
*   **Average Click-Through Rate (CTR):** Benchmark target $> 3.5\%$ on branded/commercial terms.
*   **Valid Indexed Pages:** Ratio of valid indexed pages (100% of public routes `/`, `/docs`, `/login`) with zero crawl errors or false `robots.txt` blocks.

### 2.2 Generative Engine (GEO/AEO) Visibility KPIs
*   **AI Referral Traffic:** Referrals originating from `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`.
*   **LLM Citation Sampling:** Monthly programmatic check of AI answer outputs for queries: *"What are the best self-hosted alternatives to Doppler?"* and *"How to implement AES-256-GCM envelope encryption for secrets"*.
*   **Documentation Manifest Requests:** Monitoring HTTP 200 hits to `https://sem.niranjansah87.com.np/llms.txt`.

### 2.3 Developer Business Outcome KPIs
*   **GitHub Engagement Contribution:** Referrals clicking through to GitHub repository.
*   **CLI Quickstart Execution:** Copy events on the primary quickstart terminal snippet.
*   **Console Demo Access:** Conversion rate from `/` to `/login`.

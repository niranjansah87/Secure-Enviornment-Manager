# 09 — International & Local SEO Strategy

**Document Code:** `SEO-PHASE-09`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Applicability Evaluation:** Global Open-Source Software Platform / Developer Tooling  

---

## 1. Internationalization Architecture & Language Targeting

### 1.1 Business Scope & Language Protocol
Secure Environment Manager is a globally accessible, open-source infrastructure tool targeting software developers, SREs, and DevOps practitioners worldwide. In enterprise cloud and cybersecurity sectors, **English (`en`) is the universal technical lingua franca**.

*   **Primary HTML Locale:** `en-US` declared in `RootLayout` (`<html lang="en">`).
*   **Open Graph Locale:** `en_US` defined in `layout.tsx:54`.
*   **hreflang Strategy:** Currently, SEM does not maintain translated subdirectories (e.g., `/de/`, `/ja/`, `/zh/`). Therefore, **no multi-region `hreflang` tags are introduced at this stage**.
    *   *Anti-Pattern Avoided:* Automatically generating machine-translated (AI/Google Translate) low-quality subpages without native technical review triggers Google's low-quality content filters. We strictly avoid programmatic translation until dedicated localized communities demand native documentation.
    *   *Self-Referential Canonical:* Each English page maintains a clean self-referential canonical tag to confirm its status as the authoritative global version.

### 1.2 Global Search Engine Reach (Google, Bing, Baidu, Yandex)
*   Ensure zero region-locking or geolocation-based forced redirects. All global crawlers receive identical HTTP 200 responses with zero geoblocking.
*   UTF-8 character encoding is enforced across all endpoints.

---

## 2. Local SEO Evaluation & Demarcation

### 2.1 Applicability Assessment
*   **Is SEM a physical storefront or local service provider?** **NO.**
*   **Does SEM require Google Business Profile (GBP), Bing Places, or local NAP citations?** **NO.**
    *   *Compliance with Guidelines:* Google Search Central strictly forbids creating Google Business Profile listings or injecting `LocalBusiness` structured data for software products, online services, or virtual platforms that do not maintain physical customer-facing offices with posted operating hours.
    *   *Action Taken:* We explicitly decline to create artificial `LocalBusiness` schemas or fake street addresses. Instead, the entity foundation relies purely on **`SoftwareApplication`**, **`Organization`**, and **`Person`** (Creator: Niranjan Sah).

### 2.2 Creator Geographic Anchor (E-E-A-T Transparency)
While SEM is a global digital software entity, transparent developer credentials enhance algorithmic trustworthiness:
*   Creator Niranjan Sah operates publicly from Nepal (`.np` ccTLD infrastructure), contributing openly to international open-source cybersecurity and software repositories.
*   Personal portfolio and author profile are linked to `https://niranjansah87.com.np/`, maintaining cross-entity consistency.


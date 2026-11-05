# 10 — Internal Linking & Site Architecture Strategy

**Document Code:** `SEO-PHASE-10`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Architecture Model:** Shallow-Depth Hub-and-Spoke Topology with Bidirectional Contextual Anchors  

---

## 1. Information Architecture & Crawl Depth Analysis

A search engine crawler landing on `https://sem.niranjansah87.com.np/` must be able to reach 100% of valuable, indexable content within **two clicks** ($\text{Crawl Depth} \le 2$):

```
Level 0: Homepage (/) [PR-Hub]
  │
  ├── Level 1: Technical Documentation (/docs)
  │     ├── Anchor: #threat-model
  │     ├── Anchor: #envelope-encryption
  │     ├── Anchor: #key-hierarchy
  │     ├── Anchor: #aad-integrity
  │     ├── Anchor: #cli-install
  │     ├── Anchor: #cli-workflow
  │     └── Anchor: #api-reference
  │
  ├── Level 1: Console Gateway (/login)
  │
  └── Level 1 (External Verified Authority):
        ├── GitHub Repository: https://github.com/niranjansah87/Secure-Enviornment-Manager
        └── Author Profile: https://niranjansah87.com.np/
```

All private authenticated application routes (`/dashboard`, `/[namespace]/...`) are deliberately isolated and walled off via strict `robots.txt` disallows and `noindex` headers, preventing crawler budget dilution.

---

## 2. Navigational & Header/Footer Linking

### 2.1 Persistent Public Header (`PublicHeader`)
The global header provides clean, high-priority site navigation:
*   Brand Logo $\to$ `/` (`title="Secure Environment Manager"`)
*   Documentation Link $\to$ `/docs` (`anchor="Documentation"`)
*   GitHub Source Link $\to$ `https://github.com/niranjansah87/Secure-Enviornment-Manager` (`rel="noreferrer"`)
*   Console Gateway $\to$ `/login` (`anchor="Log In"`)

### 2.2 Contextual Footer Linking (`PublicFooter`)
The footer reinforces primary entity and resource pathways:
*   **Product:** Documentation (`/docs`), Features (`/#features`), Architecture (`/docs#envelope-encryption`), Security (`/docs#threat-model`).
*   **Developer Ecosystem:** GitHub Repository, Issues Tracker, CLI Toolchain.
*   **Legal & Attribution:** MIT License, Creator Portfolio (`https://niranjansah87.com.np/`).

---

## 3. Anchor Text Best Practices & Quality Control

1.  **Descriptive Semantic Anchor Text:**
    *   *Approved:* "Read the AES-256-GCM Envelope Encryption Guide", "Explore the CLI Toolchain Documentation", "Review the System Threat Model".
    *   *Banned:* Generic phrases such as "Click here", "Read more", "Learn more", "Link".
2.  **Contextual Cross-Linking Between Homepage & Docs:**
    *   The Homepage's 3D Cryptographic section links directly to `/docs#envelope-encryption`.
    *   The Homepage's Terminal simulation links directly to `/docs#cli-install`.
    *   The Documentation's introduction links back to the Homepage value proposition.
3.  **Breadcrumb Architecture on `/docs`:**
    *   Implements Schema.org `BreadcrumbList` linking `Home (/)` $\to$ `Documentation (/docs)`.


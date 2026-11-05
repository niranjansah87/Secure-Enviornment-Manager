# 04 — Advanced On-Page Search & Content Optimization

**Document Code:** `SEO-PHASE-04`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Methodology:** Semantic Search Alignment, Heading Hierarchy Enforcement, Metadata Engineering  

---

## 1. Page-by-Page Metadata Specifications

### 1.1 Homepage (`/`)
*   **Target Primary Keyword:** Self-Hosted Secrets Manager & Open-Source Environment Sync
*   **Title Tag:** `Secure Environment Manager | Self-Hosted Secrets Management` (58 chars)
*   **Meta Description:** `Enterprise-grade, self-hosted secrets manager with AES-256-GCM envelope encryption, tamper-proof audit trails, and instant CLI synchronization. 100% on-premises data ownership.` (170 chars)
*   **Canonical URL:** `https://sem.niranjansah87.com.np/`
*   **Robots Directives:** `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
*   **Open Graph:**
    *   `og:type`: `website`
    *   `og:title`: `Secure Environment Manager | Self-Hosted Secrets Management`
    *   `og:description`: `Self-hosted, envelope-encrypted secrets management for modern engineering teams. Zero cloud dependencies.`
    *   `og:image`: `https://sem.niranjansah87.com.np/og_default.png` (1200x630)
*   **Twitter Card:** `summary_large_image` (`@niranjan8790`)

### 1.2 Documentation (`/docs`)
*   **Target Primary Keyword:** Secrets Manager Documentation & Cryptographic Architecture
*   **Title Tag:** `Documentation & Developer Architecture | Secure Environment Manager` (64 chars)
*   **Meta Description:** `Technical documentation for Secure Environment Manager: AES-256-GCM envelope encryption hierarchy (MEK to KEK to DEK), CLI installation, REST API, and CI/CD automation.` (170 chars)
*   **Canonical URL:** `https://sem.niranjansah87.com.np/docs`
*   **Robots Directives:** `index, follow, max-image-preview:large, max-snippet:-1`
*   **Open Graph:**
    *   `og:type`: `article`
    *   `og:title`: `SEM Documentation: Cryptography, CLI & Architecture`
    *   `og:description`: `Deep-dive guide into envelope encryption, AAD integrity validation, CLI setup, and REST API integration.`
    *   `og:image`: `https://sem.niranjansah87.com.np/og_default.png`

### 1.3 Console Login (`/login`)
*   **Target Primary Keyword:** SEM Console Login
*   **Title Tag:** `Log In | Secure Environment Manager Console` (43 chars)
*   **Meta Description:** `Sign in to your self-hosted Secure Environment Manager instance using Master Token, Scoped API Key, or User Credentials.` (120 chars)
*   **Canonical URL:** `https://sem.niranjansah87.com.np/login`
*   **Robots Directives:** `index, follow` (Administrative gateway, with noindex on parameter variants)

---

## 2. Heading Architecture & Semantic Hierarchy

### Homepage (`/`) Semantic Flow
```
H1: Self-Hosted Secrets Management for Engineering Teams
├── H2: Total Data Sovereignty: Zero Cloud Dependency
│   └── H3: 3-Tier AES-256-GCM Envelope Encryption (MEK → KEK → DEK)
│   └── H3: Additional Authenticated Data (AAD) Relocation Defense
├── H2: Unified Developer Workflow: Web UI, CLI & REST API
│   └── H3: Instant Terminal Sync with SEM CLI
│   └── H3: Multi-Environment Isolation (Dev, Staging, Production)
├── H2: Enterprise Compliance & Governance
│   └── H3: Immutable Append-Only Audit Trails
│   └── H3: Granular Role-Based Access Control (RBAC)
├── H2: How SEM Compares to Legacy Solutions
│   └── H3: Feature Matrix: SEM vs. Doppler vs. HashiCorp Vault
└── H2: Frequently Asked Questions
```

### Documentation (`/docs`) Semantic Flow
```
H1: Secure Environment Manager (SEM) Technical Documentation
├── H2: System Overview & Zero-Knowledge Architecture
│   └── H3: Threat Model & Security Guarantees
│   └── H3: 3-Minute Quickstart (Docker & Local Dev)
├── H2: Cryptographic Engine Deep Dive
│   └── H3: AES-256-GCM Envelope Encryption Flow
│   └── H3: Key Hierarchy: Master Key (MEK) → Project KEK → Environment DEK
│   └── H3: Cryptographic Integrity via AAD
├── H2: Developer CLI Toolchain
│   └── H3: Installation & Global Path Configuration
│   └── H3: Authentication Methods (Master Token, Scoped API Key, JWT)
│   └── H3: Secret Pull, Push & Injection Workflows
└── H2: REST API Reference & Multi-Tenant Boundaries
```

---

## 3. Media & Asset Optimization Standards

1.  **Image Formats & Dimensions:**
    *   Branding logos and badges are provided as crisp vector SVGs (`/logo.svg`, `/icon.svg`).
    *   Raster previews and screenshots are stored with exact pixel dimensions and descriptive `alt` tags (e.g., `alt="Secure Environment Manager 3D Cryptographic Architecture Diagram"`).
2.  **Lazy & Priority Loading:**
    *   Above-the-fold logo mark uses Next.js `priority={true}` to prevent layout shift.
    *   Below-the-fold terminal simulations and architecture cards are lazily loaded.
3.  **Contrast & Accessibility:**
    *   All foreground text adheres to WCAG 2.1 AA contrast requirements ($>4.5:1$ ratio on `#000000` dark background).
    *   Interactive elements maintain visible `:focus-visible` outlines for keyboard navigability.

---

## 4. Conversion-Focused SEO (CRO) Architecture

SEO visibility must translate directly into developer engagement:
*   **Hero Primary CTA:** Direct copyable command (`git clone ... && docker compose up -d`) paired with a high-contrast "Read Documentation" link.
*   **Contextual GitHub Proof:** Prominent links to GitHub source code (`https://github.com/niranjansah87/Secure-Enviornment-Manager`) reinforcing open-source trust and zero-vendor-lockin.
*   **Persistent Navigation:** Sticky header with immediate access to `/docs` and `/login` regardless of scroll depth.


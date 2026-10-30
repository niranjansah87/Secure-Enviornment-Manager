# 07 — Answer Engine Optimization (AEO) Strategy

**Document Code:** `SEO-PHASE-07`  
**System:** Secure Environment Manager (SEM)  
**Target Surfaces:** Google Featured Snippets, Bing Answers, People Also Ask (PAA), Voice Search  
**Objective:** High-Frequency Direct Answer Capture for High-Intent Developer Queries  

---

## 1. Principles of Answer-First Architecture

Answer Engine Optimization (AEO) demands structuring responses to immediate developer questions so that algorithmic extractors can parse and feature them verbatim:

1.  **Direct Answer in Paragraph 1 ($\le 50$ words):** Deliver an immediate, unambiguous answer before expanding into nuance.
2.  **Structural Formatting:** Use ordered lists (`<ol>`) for sequential instructions and tables (`<table>`) for comparative attributes.
3.  **Semantic Question Headings:** Use `<h2>` or `<h3>` containing the verbatim natural-language question.

---

## 2. High-Priority Developer Question Targets & Canonical Answers

### Q1: What is a self-hosted secrets manager?
*   **Direct Answer:**  
    > A self-hosted secrets manager is a security platform deployed directly on your own infrastructure (on-premise servers, private VPCs, or containers) to store, encrypt, and distribute sensitive credentials—such as API keys, database passwords, and environment variables—without exposing them to third-party cloud providers.
*   **Format:** Paragraph definition followed by 3 core architectural benefits (Zero-knowledge encryption, Complete data sovereignty, Compliance adherence).
*   **Target URL:** `https://sem.niranjansah87.com.np/`

### Q2: How does envelope encryption work in secrets management?
*   **Direct Answer:**  
    > Envelope encryption protects secrets by encrypting plaintext data with a unique Data Encryption Key (DEK), then encrypting the DEK with a Key Encryption Key (KEK), which is finally protected by a top-level Master Encryption Key (MEK). This ensures the master key never directly touches raw data.
*   **Format:** Definition + Diagram + 3-step hierarchy breakdown.
*   **Target URL:** `https://sem.niranjansah87.com.np/docs#envelope-encryption`

### Q3: How do I inject secrets into GitHub Actions without exposing them in git?
*   **Direct Answer:**  
    > To securely inject secrets into GitHub Actions, authenticate the SEM CLI using a scoped machine token in your workflow step, then execute `sem run -- npm test` or export variables dynamically into `$GITHUB_ENV` at build time. Raw secret values are never committed to your repository.
*   **Format:** Step-by-step YAML snippet.
*   **Target URL:** `https://sem.niranjansah87.com.np/docs#cli-workflow`

### Q4: Can I recover secrets if the master encryption key is lost?
*   **Direct Answer:**  
    > No. Because SEM uses zero-knowledge AES-256-GCM envelope encryption without architectural backdoors, secrets cannot be decrypted if the master key (`SEM_MASTER_KEY`) is lost. You must maintain secure, offline encrypted backups of your master key and database snapshots.
*   **Format:** Warning callout + recommended recovery policy.
*   **Target URL:** `https://sem.niranjansah87.com.np/docs#threat-model`

### Q5: How is SEM different from HashiCorp Vault?
*   **Direct Answer:**  
    > Unlike HashiCorp Vault, which requires complex Raft clustering, unsealing rituals, and significant memory overhead, Secure Environment Manager (SEM) is a lightweight, single-container solution designed specifically for developer environment variables and API keys, offering instant deployment and a native modern web console.
*   **Format:** Comparative markdown table.
*   **Target URL:** `https://sem.niranjansah87.com.np/`

---

## 3. Structural Implementation Guidelines for Content Developers

1.  **Avoid Filler Openings:** Never begin answers with conversational padding like *"When considering your options for managing secrets..."* or *"As many developers know..."*. Jump straight into the noun-verb technical claim.
2.  **Explicit Code Blocks:** Provide syntax-highlighted, copyable bash/yaml snippets with standard input flags.
3.  **FAQPage Structured Data Placement:** Ensure every question featured in the visible UI is represented in `FAQPage` JSON-LD to qualify for expandable SERP answer accordions.

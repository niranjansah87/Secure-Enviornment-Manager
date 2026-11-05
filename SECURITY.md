# Security Policy

Secure Environment Manager (SEM) is developer infrastructure designed specifically to safeguard sensitive environment variables and secrets. Security is our first and highest engineering priority.

---

## Supported Versions

Only the current major version series receives security updates, critical bug fixes, and cryptographic review.

| Version | Status | Security Updates |
| :--- | :--- | :--- |
| **2.x.x** | **Current (Active)** | :white_check_mark: Supported |
| 1.x.x | Legacy / Archived | :warning: Security fixes only for critical CVEs |
| < 1.0.0 | Deprecated | :x: Unsupported |

---

## Reporting a Security Vulnerability

We deeply appreciate the efforts of security researchers and community members who help protect the project and its users.

**Please DO NOT report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### Preferred Reporting Method

1. **GitHub Private Vulnerability Reporting**: Submit a confidential report directly via GitHub Security Advisories by clicking **"Report a vulnerability"** in the repository's Security tab.
2. **Direct Maintainer Contact**: If GitHub Private Vulnerability Reporting is unavailable, email the maintainers directly at:
   - **niranjansah250@gmail.com**
   - Use the subject line: `[SEM Security Report] <Brief Vulnerability Description>`
   - For sensitive disclosures, please request an encrypted communication channel or PGP key.

### Information to Include

To help us investigate, verify, and remediate the issue rapidly, please include:
- A clear description of the vulnerability, affected components (e.g., `@sem/api`, `@sem/crypto`, `@sem/sdk`, `cli`, or frontend), and potential security impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- The versions of SEM and environment affected (Docker, Node.js version, OS).
- Any proposed remediation or mitigation if available.

---

## Response Process & SLA

We follow responsible disclosure principles and commit to realistic, maintainer-backed response standards:

| Phase | Target Timeline | Details |
| :--- | :--- | :--- |
| **Initial Acknowledgment** | Within 48 hours | Confirmation of report receipt and initial triage. |
| **Assessment & Reproduction** | Within 5 business days | Maintainer validation of the reported findings. |
| **Patch Development & Testing** | Within 14 business days | Implementation and regression testing of remediation. |
| **Coordinated Disclosure** | Negotiated | Public release and advisory published alongside the patch release. |

We request that researchers allow a reasonable window for remediation before publishing details publicly.

---

## Security Architecture & Guarantees

SEM v2 implements defense-in-depth principles:

### 1. Cryptographic Envelope Architecture
- **Algorithm**: Authenticated Encryption using **AES-256-GCM** with 96-bit (12-byte) cryptographically random nonces and 128-bit authentication tags.
- **Key Hierarchy**: Master Key (`SEM_MASTER_KEY`) wraps Project Key Encryption Keys (KEK), which wrap Environment Data Encryption Keys (DEK), which encrypt individual secret values.
- **AAD Binding**: Additional Authenticated Data (AAD) cryptographically binds every ciphertext to its resource identifier (`org:project:env:key`). Ciphertext relocated between environments or keys fails authentication automatically.
- **Key Separation**: Data encryption keys, token signing keys, and HMAC verification keys are strictly segregated and never shared across boundaries.

### 2. Authentication & Session Management
- **Asymmetric JWTs**: Access tokens are signed using **ECDSA P-256 (ES256)**. Token verification explicitly enforces the `ES256` algorithm, rejecting algorithm confusion attacks (e.g., HMAC key substitution or `none` algorithm).
- **Refresh Token Rotation**: Refresh tokens are single-use (`semr_...`). Every refresh operation rotates the token; concurrent or repeated usage triggers automatic session revocation.
- **Password Security**: Passwords are hashed with memory-hard **Argon2id** (time cost 3, memory 64MB, parallelism 4) with timing-safe comparison.
- **Session Revocation**: Active sessions can be terminated instantly by ID or globally per user.

### 3. Multi-Tenant Isolation
- **Tenant Scoping**: All database queries are filtered by `orgId` derived strictly from verified JWT claims, preventing Insecure Direct Object References (IDOR).
- **Role-Based Access Control**: Granular scopes (`secrets:read`, `secrets:write`, `admin:manage`, etc.) are enforced by backend guards, never trusted from client inputs.

### 4. Audit Trail
- All credential actions (creations, rotations, reads, deletions, and rollback snapshots) produce immutable audit records including actor ID, action name, resource identifier, IP address, and timestamp.

# Project Governance

This document describes the governance structure and decision-making model for Secure Environment Manager (SEM).

---

## 1. Governance Principles

- **Open Source First**: All core software is developed publicly under the MIT license.
- **Security as a Precondition**: Architectural or feature decisions never compromise cryptographic hygiene, authentication boundaries, or multi-tenant isolation.
- **Transparency & Accountability**: Key design decisions are documented in GitHub Issues and Architecture Decision Records (ADRs).
- **Meritocratic Progression**: Consistent contributors are invited to assume code review and maintainer responsibilities.

---

## 2. Roles and Responsibilities

### Maintainers (Core Team)
Maintainers have write and administrative access to the repository. They are responsible for:
- Reviewing and merging pull requests.
- Coordinating security vulnerability triage and patch releases.
- Setting the technical roadmap and release cadence.
- Ensuring compliance with the Code of Conduct.

**Lead Maintainer:** Niranjan Sah ([@niranjansah87](https://github.com/niranjansah87))

### Contributors
Anyone who submits code, documentation, bug reports, or helps triage issues. Contributors who demonstrate sustained high-quality contributions and security consciousness may be nominated as Maintainers.

---

## 3. Decision-Making Process

- **Minor Changes & Bug Fixes**: Approved and merged by any maintainer after passing CI checks (linting, typechecking, unit tests, and integration tests).
- **Major Features & Cryptographic Changes**: Require an RFC (Request for Comments) discussion issue, agreement among maintainers, and dedicated security regression test coverage.
- **Breaking Changes**: Governed strictly by Semantic Versioning (SemVer) and reserved for major version bumps with documented migration paths.

---

## 4. Conflict Resolution

Disagreements among contributors or maintainers are resolved through consensus wherever possible. If consensus cannot be achieved, the Lead Maintainer has the final decision-making authority, with justification recorded in the issue or PR.


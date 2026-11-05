# Getting Support for Secure Environment Manager

Thank you for using Secure Environment Manager (SEM). Here is how to get help, report issues, and connect with the community.

---

## Channels

### 1. Questions, How-To, and Architectural Discussions
For general questions, design discussions, integration advice (SDK, CLI, or Docker setup), and open-ended feedback:
* **[GitHub Discussions](https://github.com/niranjansah87/Secure-Enviornment-Manager/discussions)**
* Please search existing discussions first before starting a new thread.

### 2. Bug Reports & Feature Requests
If you have encountered a bug or have an idea for a feature:
* **[GitHub Issues](https://github.com/niranjansah87/Secure-Enviornment-Manager/issues)**
* Please check that your issue is not a duplicate.
* Use our provided issue templates to ensure all necessary diagnostic information is included (logs, Node/Docker version, minimal reproduction steps).

### 3. Security Vulnerabilities
**Do NOT file public issues for security vulnerabilities or secret leaks.**
* Follow the instructions in **[SECURITY.md](./SECURITY.md)** to report vulnerabilities confidentially via GitHub Security Advisories or maintainer email.

---

## Troubleshooting Checklist

Before filing an issue, please verify:

1. **Prerequisites**: Ensure you are running Node.js `>= 22.0.0` and `pnpm >= 9.0.0` (or Docker with Compose v2).
2. **Environment Variables**: Verify `.env` is populated from `.env.example`. Required keys like `SEM_MASTER_KEY` and `JWT_PRIVATE_KEY` can be generated with:
   ```bash
   pnpm keys:generate
   ```
3. **Database Migrations**: If upgrading, make sure migrations have run:
   ```bash
   pnpm db:migrate
   ```
4. **Logs**: Check container or console logs for specific error codes (e.g., `ACCOUNT_LOCKED`, `INVALID_CREDENTIALS`, `DECRYPTION_FAILED`).

# Security Policy

## Supported Versions

The following versions of Secure Environment Manager are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

We take the security of Secure Environment Manager seriously. If you believe you have found a security vulnerability, please report it to us as soon as possible.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
**security@example.com**

> [!NOTE]
> Please replace the above email with your actual security contact address.

### Responsible Disclosure

- Provide a detailed description of the vulnerability.
- Include steps to reproduce the issue (PoC).
- Inform us if you have already disclosed the vulnerability to others.
- Give us reasonable time to investigate and mitigate the issue before making any public disclosure.

## Response Time

We aim to acknowledge all security reports within **48 hours** and provide a preliminary assessment within **5 business days**.

## Security Practices

Our commitment to security includes the following practices:

### Encryption
All environment variables are encrypted at rest using **AES-256 (Fernet)**. Encryption keys are managed by the user and should never be committed to version control.

### API Security
All API endpoints (except public redirects) require **Bearer Token** authentication. Tokens are managed per-namespace to ensure isolation between projects.

### Secret Handling
The application is designed to handle sensitive information. We follow best practices for:
- Secure session management.
- Protection against CSRF and XSS.
- Audit logging of all sensitive operations (creates, updates, deletes, and access).
- Secure template generation for common frameworks.

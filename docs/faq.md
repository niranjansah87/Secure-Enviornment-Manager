# FAQ

Commonly asked questions about Secure Environment Manager (SEM).

## 🛡️ Security & Encryption

### Q: Can I recover my secrets if I lose my `ENCRYPTION_KEY`?
**A: No.** SEM uses the Fernet (AES-256) standard, which is cryptographically secure. There are no backdoors or secondary keys. If you lose the encryption key used to write the data, the secrets are unrecoverable. 

### Q: Is my data sent to the cloud?
**A: No.** SEM is a **self-hosted** solution. Your data is stored on *your* local disk, and all encryption happens on *your* server. No secret data ever leaves your infrastructure. 

### Q: How safe is the `MASTER_API_TOKEN`?
**A: Extemely safe if handled correctly.** It is a cryptographically strong secret that grants full access to your SEM instance. We recommend storing it in a secure password manager and only using it for administrative tasks or root-level automation.

## 🚀 Usage & Integration

### Q: Can I use SEM with Docker and Kubernetes?
**A: Yes.** We provide a `Dockerfile` and `docker-compose.yml` for quick containerized deployment. For Kubernetes, you can mount your `data/` directory as a Persistent Volume (PV).

### Q: Can I automate secret injection into my CI/CD?
**A: Yes.** Our [CLI Tool](cli-guide.md) is designed exactly for this. You can use it in GitHub Actions, GitLab CI, or Jenkins to fetch secrets and export them as a `.env` file for your build process.

### Q: What is a "Namespace"?
**A: A Namespace is a logical project container.** For example, you might have a namespace called `marketing-site` and another called `data-pipeline`. This allows you to isolate secrets and grant access to different teams using namespace-specific API keys.

## 🛠️ Management & Reliability

### Q: How do I rotate my encryption key?
**A: Rotation currently requires a manual migration.** 
1.  Export your secrets as a `.env` file using the old key.
2.  Update your `ENCRYPTION_KEY` in the server's `.env`.
3.  Re-import the `.env` file using the new key.
*We are working on an automated rotation feature for future releases.*

### Q: Is SEM production-ready?
**A: Yes.** SEM is used by multiple teams for managing staging and production credentials. However, as with any security tool, ensure you follow the [Security Best Practices](security.md) and keep regular backups of your `data/` directory.

### Q: Can I run multiple environments (e.g., `dev`, `test`, `prod`)?
**A: Yes.** You can create as many environments as you need within each namespace. Each environment is stored as a separate encrypted file. 

---

Have more questions? Check out the [Troubleshooting](troubleshooting.md) guide or open an issue on our **GitHub Repository**.

# 🛠️ Utility Scripts

This directory contains utility scripts for managing and maintaining the Secure Environment Manager.

## 📜 Available Scripts

### 🔑 `generate_keys.py`

**Purpose:** Generate cryptographically secure encryption keys for the application.

**Usage:**
```bash
python scripts/generate_keys.py
```

**Output:** Prints a Fernet encryption key that should be added to your `.env` file as `ENCRYPTION_KEY`.

**When to use:**
- Initial setup of the application
- Key rotation (requires re-encrypting all existing data)

---

### 💻 `dotenv-cli.py`

**Purpose:** Command-line interface for managing environment variables without using the web dashboard.

**Usage:**
```bash
python scripts/dotenv-cli.py [command] [options]
```

**Features:**
- View environment variables
- Add/update variables
- Delete variables
- Export environments
- Bulk operations

**When to use:**
- Automation scripts
- CI/CD pipelines
- Batch operations
- Server management without GUI access

---

### 📧 `email_backup.py`

**Purpose:** Automated backup of environment files via email.

**Usage:**
```bash
python scripts/email_backup.py
```

**Configuration:** Requires email settings in `.env` file (see `docs/EMAIL_BACKUP_GUIDE.md` for details).

**Features:**
- Encrypts and emails backup files
- Supports multiple namespaces/environments
- Configurable schedule
- Secure transmission

**When to use:**
- Scheduled backups
- Disaster recovery planning
- Off-site backup storage

---

### 🪟 `run_backup.bat`

**Purpose:** Windows batch script to execute email backups.

**Usage:**
```cmd
scripts\run_backup.bat
```

**Features:**
- Windows Task Scheduler compatible
- Automated execution
- Error logging

**When to use:**
- Windows servers
- Scheduled tasks via Task Scheduler
- Automated backup workflows

---

## 📚 Related Documentation

- **Setup Guide:** `docs/SETUP.md`
- **CLI Documentation:** `docs/CLI_README.md`
- **Email Backup Guide:** `docs/EMAIL_BACKUP_GUIDE.md`
- **Windows Scheduler Guide:** `docs/WINDOWS_SCHEDULER_GUIDE.md`

---

## 🔒 Security Notes

- Never commit generated keys to version control
- Store backup emails securely
- Use strong passwords for email accounts
- Regularly rotate encryption keys
- Test backup restoration procedures

---

## 🤝 Contributing

When adding new utility scripts:

1. Place them in this `scripts/` directory
2. Update this README with documentation
3. Add appropriate error handling
4. Include usage examples
5. Document required environment variables

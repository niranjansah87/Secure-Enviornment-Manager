# Backup and Disaster Recovery Guide

## Overview
This guide covers backup strategies and disaster recovery procedures for the Dotenv Server.

## Backup Strategy

### 1. Automated Backup Script

Create a backup script that runs daily via cron:

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATA_DIR="/path/to/dotenv-server/data"

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup encrypted data files
cp -r "$DATA_DIR" "$BACKUP_DIR/$DATE/"

# Backup encryption key (CRITICAL!)
cp .env "$BACKUP_DIR/$DATE/.env.backup"

# Compress backup
tar -czf "$BACKUP_DIR/dotenv_backup_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "dotenv_backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: dotenv_backup_$DATE.tar.gz"
```

### 2. Cron Job Setup

Add to crontab (`crontab -e`):
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/dotenv-backup.log 2>&1
```

### 3. Cloud Storage Backup

Sync backups to cloud storage:

```bash
# Using rclone (supports AWS S3, Google Drive, etc.)
rclone sync /path/to/backups remote:dotenv-backups

# Using AWS S3
aws s3 sync /path/to/backups s3://your-bucket/dotenv-backups/
```

## What to Backup

### Critical Files
1. **`data/` directory** - All encrypted environment files
2. **`.env` file** - Contains ENCRYPTION_KEY (MOST CRITICAL!)
3. **`data/*/*.history.jsonl`** - Version history files
4. **`audit_logs/`** - Audit trail
5. **`api_keys.json`** - API keys configuration

### Optional Files
- `templates_config.json` - Variable templates
- Database files (if using external DB)

## Disaster Recovery Procedures

### Scenario 1: Server Crash

1. **Install fresh server:**
   ```bash
   git clone <your-repo>
   cd dotenv-server
   pip install -r requirements.txt
   ```

2. **Restore backup:**
   ```bash
   # Extract latest backup
   tar -xzf dotenv_backup_YYYYMMDD_HHMMSS.tar.gz
   
   # Restore data directory
   cp -r YYYYMMDD_HHMMSS/data ./
   
   # Restore encryption key (CRITICAL!)
   cp YYYYMMDD_HHMMSS/.env.backup ./.env
   
   # Restore audit logs
   cp -r YYYYMMDD_HHMMSS/audit_logs ./
   ```

3. **Verify restoration:**
   ```bash
   python app.py
   # Test accessing environments
   ```

### Scenario 2: Data Corruption

1. **Stop the server:**
   ```bash
   sudo systemctl stop dotenv-server
   ```

2. **Restore from backup:**
   ```bash
   # Backup current corrupted data
   mv data data.corrupted
   
   # Restore from latest good backup
   tar -xzf dotenv_backup_YYYYMMDD_HHMMSS.tar.gz
   cp -r YYYYMMDD_HHMMSS/data ./
   ```

3. **Restart server:**
   ```bash
   sudo systemctl start dotenv-server
   ```

### Scenario 3: Lost Encryption Key

**⚠️ WARNING:** Without the encryption key, encrypted data is UNRECOVERABLE!

**Prevention:**
- Store encryption key in multiple secure locations
- Use a password manager (1Password, LastPass)
- Store encrypted backup in cloud (AWS Secrets Manager, Azure Key Vault)
- Print and store in physical safe

**If lost:**
- Restore `.env` file from backup
- If no backup exists, data is permanently lost

## Backup Best Practices

### 1. 3-2-1 Rule
- **3** copies of data
- **2** different storage types (local + cloud)
- **1** off-site backup

### 2. Test Restores
```bash
# Monthly restore test
mkdir /tmp/restore-test
cd /tmp/restore-test
tar -xzf /path/to/backups/dotenv_backup_latest.tar.gz
# Verify files are intact
```

### 3. Encryption Key Security
```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name dotenv-encryption-key \
  --secret-string "$(cat .env | grep ENCRYPTION_KEY)"

# Retrieve when needed
aws secretsmanager get-secret-value \
  --secret-id dotenv-encryption-key \
  --query SecretString \
  --output text
```

### 4. Monitoring
```bash
# Check backup age
find /path/to/backups -name "*.tar.gz" -mtime -1 | grep -q . || \
  echo "WARNING: No recent backups!" | mail -s "Backup Alert" admin@example.com
```

## Recommended Backup Schedule

| Frequency | What | Retention |
|-----------|------|-----------|
| Hourly | Data directory snapshot | 24 hours |
| Daily | Full backup | 30 days |
| Weekly | Full backup to cloud | 90 days |
| Monthly | Archive backup | 1 year |

## Quick Recovery Commands

```bash
# Quick backup
tar -czf backup_$(date +%Y%m%d).tar.gz data/ .env audit_logs/

# Quick restore
tar -xzf backup_YYYYMMDD.tar.gz

# Verify encryption key
python -c "from cryptography.fernet import Fernet; import os; \
  from dotenv import load_dotenv; load_dotenv(); \
  print('Key valid!' if os.getenv('ENCRYPTION_KEY') else 'Key missing!')"
```

## Emergency Contacts

- **Server Admin:** [Your contact]
- **Backup Location:** [Path/URL]
- **Cloud Backup:** [Service/Bucket name]
- **Encryption Key Backup:** [Secure location]

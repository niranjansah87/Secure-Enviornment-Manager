# Email Backup Configuration Guide

## Setup Instructions

### 1. Add Email Configuration to .env

Add these variables to your `.env` file:

```bash
# Email Backup Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
BACKUP_EMAIL=backup-recipient@gmail.com

# Optional: Custom backup directory
BACKUP_DIR=./backups
```

### 2. Gmail Setup (Recommended)

If using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Create App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Dotenv Backup"
   - Copy the 16-character password
   - Use this as `SENDER_PASSWORD` in .env

### 3. Other Email Providers

**Outlook/Hotmail:**
```bash
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

**Yahoo:**
```bash
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
```

**Custom SMTP:**
```bash
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
```

## Usage

### Manual Backup

Run the backup script manually:

```bash
python email_backup.py
```

### Automated Backups

#### Daily Backup (2 AM)

**Windows (Task Scheduler):**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Dotenv Daily Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   - Program: `python`
   - Arguments: `C:\kumari ai\dotenv-server-master\email_backup.py`
   - Start in: `C:\kumari ai\dotenv-server-master`

**Linux/Mac (Crontab):**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/dotenv-server && python email_backup.py >> /var/log/dotenv-backup.log 2>&1
```

#### Weekly Backup (Sunday 2 AM)

**Windows Task Scheduler:**
- Same as daily, but set trigger to "Weekly" on Sunday

**Linux/Mac (Crontab):**
```bash
# Weekly on Sunday at 2 AM
0 2 * * 0 cd /path/to/dotenv-server && python email_backup.py >> /var/log/dotenv-backup.log 2>&1
```

#### Multiple Schedules

You can set up multiple schedules:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/dotenv-server && python email_backup.py

# Weekly on Sunday at 3 AM
0 3 * * 0 cd /path/to/dotenv-server && python email_backup.py

# Monthly on 1st at 4 AM
0 4 1 * * cd /path/to/dotenv-server && python email_backup.py
```

## What Gets Backed Up

The backup includes:
- ✅ `data/` - All encrypted environment files
- ✅ `.env` - Encryption key (CRITICAL!)
- ✅ `audit_logs/` - Audit trail
- ✅ `templates_config.json` - Variable templates

## Backup Retention

- **Local backups:** Kept for 7 days (configurable)
- **Email backups:** Permanent (stored in your email)

## Security Considerations

### Email Security
- ✅ Use app-specific passwords (not your main password)
- ✅ Enable 2FA on email account
- ✅ Use encrypted email if possible
- ⚠️ Email contains encryption key - secure your email account!

### Backup Storage
- Store email backups in a secure folder
- Consider using encrypted email service
- Download and store locally in secure location
- Use cloud storage with encryption (Google Drive, Dropbox)

## Troubleshooting

### "Authentication failed"
- Check SENDER_EMAIL and SENDER_PASSWORD
- For Gmail, use App Password, not regular password
- Ensure 2FA is enabled

### "Connection refused"
- Check SMTP_SERVER and SMTP_PORT
- Verify firewall allows SMTP connections
- Try port 465 (SSL) instead of 587 (TLS)

### "File too large"
- Most email providers limit attachments to 25MB
- If backup exceeds limit, consider:
  - Uploading to cloud storage instead
  - Splitting into multiple files
  - Using dedicated backup service

### "Missing email configuration"
- Ensure all required variables are in .env:
  - SENDER_EMAIL
  - SENDER_PASSWORD
  - BACKUP_EMAIL

## Testing

Test the backup system:

```bash
# Run manual backup
python email_backup.py

# Check output for errors
# Verify email received
# Test restore process
```

## Restore from Email Backup

1. Download the zip file from email
2. Extract to temporary location
3. Copy files to server:
   ```bash
   # Stop server
   sudo systemctl stop dotenv-server
   
   # Backup current data (just in case)
   mv data data.old
   
   # Restore from backup
   unzip dotenv_backup_YYYYMMDD_HHMMSS.zip
   cp -r data ./
   cp .env ./
   
   # Restart server
   sudo systemctl start dotenv-server
   ```

## Advanced Configuration

### Custom Backup Schedule

Edit `email_backup.py` to customize:

```python
# Change retention period
self.cleanup_old_backups(keep_days=30)  # Keep 30 days

# Add more files to backup
zipf.write('custom_file.json', 'custom_file.json')
```

### Multiple Recipients

Modify the script to send to multiple emails:

```python
msg['To'] = ', '.join(['email1@example.com', 'email2@example.com'])
```

### Compression Level

Adjust compression in `create_backup_zip`:

```python
# Maximum compression (slower, smaller file)
zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9)

# No compression (faster, larger file)
zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_STORED)
```

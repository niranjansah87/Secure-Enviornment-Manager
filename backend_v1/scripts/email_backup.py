#!/usr/bin/env python3
"""
Email Backup Service
Automatically sends encrypted backup of data directory via email
"""

import os
import sys
import smtplib
import zipfile
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EmailBackupService:
    def __init__(self):
        # Email configuration from environment variables
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_PASSWORD')
        self.recipient_email = os.getenv('BACKUP_EMAIL')
        
        # Backup configuration
        self.data_dir = os.getenv('DATA_DIR', './data')
        self.backup_dir = os.getenv('BACKUP_DIR', './backups')
        
        # Validate configuration
        if not all([self.sender_email, self.sender_password, self.recipient_email]):
            raise ValueError("Missing email configuration. Please set SENDER_EMAIL, SENDER_PASSWORD, and BACKUP_EMAIL in .env")
    
    def create_backup_zip(self) -> str:
        """Create a zip file of the data directory"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"dotenv_backup_{timestamp}.zip"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        # Create backup directory if it doesn't exist
        os.makedirs(self.backup_dir, exist_ok=True)
        
        print(f"📦 Creating backup: {backup_filename}")
        
        # Create zip file
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add data directory
            data_path = Path(self.data_dir)
            if data_path.exists():
                for file_path in data_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(data_path.parent)
                        zipf.write(file_path, arcname)
                        print(f"  ✓ Added: {arcname}")
            
            # Add .env file (contains encryption key - CRITICAL!)
            env_file = Path('.env')
            if env_file.exists():
                zipf.write(env_file, '.env')
                print(f"  ✓ Added: .env (encryption key)")
            
            # Add audit logs if they exist
            audit_dir = Path('audit_logs')
            if audit_dir.exists():
                for file_path in audit_dir.rglob('*.jsonl'):
                    if file_path.is_file():
                        arcname = file_path.relative_to('.')
                        zipf.write(file_path, arcname)
                        print(f"  ✓ Added: {arcname}")
            
            # Add templates config
            templates_file = Path('templates_config.json')
            if templates_file.exists():
                zipf.write(templates_file, 'templates_config.json')
                print(f"  ✓ Added: templates_config.json")
        
        # Get file size
        file_size = os.path.getsize(backup_path)
        file_size_mb = file_size / (1024 * 1024)
        print(f"✅ Backup created: {backup_filename} ({file_size_mb:.2f} MB)")
        
        return backup_path
    
    def send_email_with_attachment(self, attachment_path: str) -> bool:
        """Send email with backup attachment"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = self.recipient_email
            msg['Subject'] = f"Dotenv Server Backup - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            # Email body
            body = f"""
Automated Backup Report
=======================

Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Backup File: {os.path.basename(attachment_path)}
File Size: {os.path.getsize(attachment_path) / (1024 * 1024):.2f} MB

This backup contains:
- Encrypted environment variable files (data/)
- Encryption key (.env) - CRITICAL for data recovery
- Audit logs (audit_logs/)
- Template configurations (templates_config.json)

⚠️ IMPORTANT: Store this backup securely. Without the encryption key (.env), 
the data cannot be decrypted.

To restore from this backup:
1. Extract the zip file
2. Copy data/ directory to your server
3. Copy .env file to your server root
4. Restart the server

---
Dotenv Server Automated Backup Service
"""
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach backup file
            print(f"📎 Attaching backup file...")
            with open(attachment_path, 'rb') as f:
                part = MIMEBase('application', 'zip')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename={os.path.basename(attachment_path)}'
                )
                msg.attach(part)
            
            # Send email
            print(f"📧 Sending email to {self.recipient_email}...")
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            print(f"✅ Email sent successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return False
    
    def cleanup_old_backups(self, keep_days: int = 7):
        """Remove backups older than specified days"""
        if not os.path.exists(self.backup_dir):
            return
        
        print(f"🧹 Cleaning up backups older than {keep_days} days...")
        current_time = datetime.now().timestamp()
        removed_count = 0
        
        for filename in os.listdir(self.backup_dir):
            if filename.endswith('.zip'):
                file_path = os.path.join(self.backup_dir, filename)
                file_age_days = (current_time - os.path.getmtime(file_path)) / 86400
                
                if file_age_days > keep_days:
                    os.remove(file_path)
                    print(f"  ✓ Removed: {filename} ({file_age_days:.1f} days old)")
                    removed_count += 1
        
        if removed_count > 0:
            print(f"✅ Removed {removed_count} old backup(s)")
        else:
            print(f"✓ No old backups to remove")
    
    def run(self):
        """Execute backup and email process"""
        print("=" * 60)
        print("Dotenv Server - Email Backup Service")
        print("=" * 60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # Create backup
            backup_path = self.create_backup_zip()
            print()
            
            # Send email
            success = self.send_email_with_attachment(backup_path)
            print()
            
            # Cleanup old backups
            self.cleanup_old_backups(keep_days=7)
            print()
            
            if success:
                print("=" * 60)
                print("✅ Backup completed successfully!")
                print("=" * 60)
                return 0
            else:
                print("=" * 60)
                print("⚠️ Backup created but email failed")
                print("=" * 60)
                return 1
                
        except Exception as e:
            print()
            print("=" * 60)
            print(f"❌ Backup failed: {e}")
            print("=" * 60)
            return 1

def main():
    try:
        service = EmailBackupService()
        sys.exit(service.run())
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

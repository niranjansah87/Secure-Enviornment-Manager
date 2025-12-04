@echo off
REM Dotenv Server Email Backup Script
REM This batch file runs the email backup and logs output

echo ========================================
echo Dotenv Server Email Backup
echo Started: %date% %time%
echo ========================================

cd /d "C:\kumari ai\dotenv-server-master"

python email_backup.py >> backup.log 2>&1

echo.
echo ========================================
echo Backup completed: %date% %time%
echo ========================================
echo.

REM Optional: Keep only last 100 lines of log
REM powershell -Command "Get-Content backup.log -Tail 100 | Set-Content backup.log"

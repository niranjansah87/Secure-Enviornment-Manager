#!/bin/sh
set -e

mkdir -p /app/data /app/audit_logs /app/logs
chmod -R 755 /app/data /app/audit_logs /app/logs 2>/dev/null || true

exec gunicorn -w 2 -b 0.0.0.0:8070 app:app

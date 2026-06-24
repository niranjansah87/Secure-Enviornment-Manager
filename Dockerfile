FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for Flask
RUN groupadd --gid 1000 sem && \
    useradd --uid 1000 --gid sem --shell /bin/false --create-home sem

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=sem:sem . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/audit_logs /app/logs && \
    chown -R sem:sem /app/data /app/audit_logs /app/logs

# Ensure tmp directory exists for Prometheus
RUN mkdir -p /tmp/prometheus_multiproc && chown sem:sem /tmp/prometheus_multiproc

EXPOSE 8070

# Switch to non-root user
USER sem

CMD ["python", "-c", "import os; os.makedirs('/app/data', exist_ok=True); os.makedirs('/app/audit_logs', exist_ok=True); os.makedirs('/app/logs', exist_ok=True); import subprocess; subprocess.run(['chmod', '-R', '755', '/app/data', '/app/audit_logs', '/app/logs'], stderr=subprocess.DEVNULL); exec 'gunicorn -w 2 -b 0.0.0.0:8070 app:app'.split()"]

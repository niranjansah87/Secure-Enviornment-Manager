# Deployment

Secure Environment Manager (SEM) can be deployed in a variety of environments, from single-server setups to containerized orchestration.

## 1. Professional Production Stack
The recommended production stack for SEM is:
*   **Web Framework**: Flask (Backend) & Next.js (Frontend).
*   **WSGI Server**: Gunicorn (for Python concurrency).
*   **Reverse Proxy**: Nginx or Caddy (for SSL termination and security).
*   **Process Manager**: Systemd or Docker Compose.

## 2. Docker Deployment (Recommended)
SEM includes a multi-stage `Dockerfile` and a `docker-compose.yml` for easy setup.

### Quick Start with Docker Compose
1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/niranjansah87/Secure-Enviornment-Manager.git
    cd Secure-Enviornment-Manager
    ```

2.  **Configure Environment**:
    Edit the `docker-compose.yml` to include your `ENCRYPTION_KEY` and `FLASK_SECRET_KEY`.

3.  **Start the Stack**:
    ```bash
    docker-compose up -d
    ```
    This will start the SEM backend, frontend, and a Prometheus instance for monitoring.

## 3. Manual Deployment (Linux/Ubuntu)

### Backend (Gunicorn + Systemd)
1.  **Install Python 3.10+ and Gunicorn**:
    ```bash
    pip install gunicorn requests flask cryptography
    ```

2.  **Create a Systemd Service**:
    Create `/etc/systemd/system/sem-backend.service`:
    ```ini
    [Unit]
    Description=SEM Backend
    After=network.target

    [Service]
    User=www-data
    WorkingDirectory=/var/www/sem
    EnvironmentFile=/var/www/sem/.env
    ExecStart=/usr/local/bin/gunicorn -w 4 -b 127.0.0.1:8070 app:app

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Enable and Start**:
    ```bash
    sudo systemctl enable sem-backend
    sudo systemctl start sem-backend
    ```

### Reverse Proxy (Nginx)
Create a server block in your Nginx config:
```nginx
server {
    listen 443 ssl;
    server_name secrets.acme.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8070;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

## 4. Scaling Considerations

### 📁 Storage & Persistence
- **Stateful Storage**: Data is stored locally on the filesystem. To scale horizontally, use a shared network-attached storage (NAS) or an Amazon EFS mount for the `data/` directory.
- **Backups**: Periodically back up the `data/` directory and your `.env` file (especially the `ENCRYPTION_KEY`).

### ⚖️ Load Balancing
- You can run multiple instances of the backend behind a load balancer (e.g., AWS ALB or HAProxy).
- **Session Stickiness**: Ensure "Session Affinity" is enabled if you are using cookie-based authentication.

## 5. Security Checklist
> [!IMPORTANT]
> **Use TLS**: Never transmit secrets over plain HTTP.
> **Firewall**: Restrict access to ports `8070` and `3000`. Only expose port `443` (via Nginx/Caddy).
> **Monitoring**: Use the built-in Prometheus metrics to set up alerts for high error rates or unauthorized access attempts.

---

Next: [Troubleshooting](troubleshooting.md)

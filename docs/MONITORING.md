# Monitoring Setup Guide (Prometheus & Grafana)

This guide explains how to set up, access, and utilize the built-in monitoring stack for the Secure Environment Manager.

## Architecture Overview

The monitoring stack consists of three main components:
1. **Exporters**: The Backend (Flask) and Frontend (Next.js) expose real-time metrics.
2. **Prometheus**: Scrapes and stores time-series data from the exporters.
3. **Grafana**: Provides a visual dashboard to monitor system health and security events.

---

## Quick Start

The monitoring stack is fully integrated into the `docker-compose.yml` file.

1. **Deploy the stack:**
   ```bash
   docker-compose up -d
   ```

2. **Verify Metrics Endpoints:**
   - **Backend**: `http://localhost:8070/metrics`
   - **Frontend**: `http://localhost:3000/api/metrics`

3. **Access Monitoring Tools:**
   - **Prometheus UI**: `http://localhost:9090`
   - **Grafana Dashboard**: `http://localhost:3001` (Default: `admin` / `admin`)

---

## Grafana Configuration

### Default Credentials
- **Username**: `admin`
- **Password**: `admin` (You will be prompted to change this on first login)

### Pre-provisioned Dashboard: "SEM Overview"
We have provided a custom dashboard called **"SEM Overview"** that includes:
- **Security**: Success vs. Failed login ratios.
- **Traffic**: Request rates (RPS) and latency.
- **Activity**: Secret modification and access trends.
- **Resources**: Memory/CPU usage for both services.

---

## Custom Metrics Reference

### Backend (Python/Flask)
We track several project-specific metrics:
- `sem_login_success_total`: Total count of successful authentications.
- `sem_login_failure_total`: Total count of failed logins (labels: `reason`).
- `sem_secret_updates_total`: Count of modifications (labels: `namespace`, `environment`).
- `sem_secret_access_total`: Count of secret reads/exports (labels: `namespace`, `environment`).

### Frontend (Next.js/Node.js)
Standard Node.js metrics are exposed under the `sem_frontend_` prefix:
- `sem_frontend_nodejs_heap_size_used_bytes`: Current memory usage.
- `sem_frontend_nodejs_eventloop_lag_seconds`: Server responsiveness.

---

## Security Considerations

> [!WARNING]
> **Port Exposure**: In the default `docker-compose.yml`, ports **9090** (Prometheus) and **3001** (Grafana) are exposed to the internet. 
> 
> **Recommendations for Production:**
> 1. **Change Passwords**: Immediately update the Grafana admin password.
> 2. **Network Restricted**: If possible, remove the port exposures for `9090` and use an SSH tunnel or VPN to access the internal Docker network.
> 3. **Firewall**: Restrict access to these ports to known IP addresses only.

---

## Troubleshooting

- **No Data in Grafana**: 
    - Check if the Prometheus datasource is connected (`Configuration` -> `Data Sources`). It should point to `http://prometheus:9090`.
    - Check Prometheus Targets (`http://localhost:9090/targets`) to ensure both `sem-backend` and `sem-frontend` are marked as **UP**.
- **Backend Metrics Missing**: 
    - Ensure the `PROMETHEUS_MULTIPROC_DIR` environment variable is set in your backend container. This is required for Gunicorn support.

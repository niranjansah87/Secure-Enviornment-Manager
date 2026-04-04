# Local Monitoring Setup (Without Docker)

This guide explains how to manually set up and test Prometheus and Grafana on your Windows system without using Docker containers.

## 1. Prepare Your Environment

Before starting the monitoring services, you need to configure your Backend and Frontend to expose metrics.

### Backend (Python)
Prometheus requires a temporary directory to store metrics in multiprocess mode (required for Gunicorn/Flask).

1.  **Create a metrics directory**:
    - Open File Explorer and create `C:\temp\prometheus_metrics` (or any path of your choice).
2.  **Set Environment Variables**:
    - In your `.env` file or terminal, set:
    ```env
    PROMETHEUS_MULTIPROC_DIR=C:\temp\prometheus_metrics
    ```
3.  **Run the Backend**:
    ```bash
    python app.py
    ```
4.  **Verify**: Open `http://localhost:8070/metrics` in your browser. You should see text-based metrics.

### Frontend (Next.js)
1.  **Run the Frontend**:
    ```bash
    npm run dev
    ```
2.  **Verify**: Open `http://localhost:3000/api/metrics` in your browser.

---

## 2. Install & Run Prometheus

1.  **Download**: Go to [prometheus.io/download](https://prometheus.io/download) and download the **Windows** binary (zip).
2.  **Extract**: Unzip the folder to your preferred location.
3.  **Configure**: Edit the `prometheus.yml` file in the extracted folder:
    ```yaml
    scrape_configs:
      - job_name: 'sem-backend'
        static_configs:
          - targets: ['localhost:8070']

      - job_name: 'sem-frontend'
        metrics_path: '/api/metrics'
        static_configs:
          - targets: ['localhost:3000']
    ```
4.  **Launch**: Double-click `prometheus.exe`.
5.  **Verify UI**: Open [http://localhost:9090](http://localhost:9090) and check `Status` -> `Targets`. Both should be **UP**.

---

## 3. Install & Run Grafana

1.  **Download**: Go to [grafana.com/grafana/download](https://grafana.com/grafana/download?platform=windows) and download the **Standalone Windows Binary** (zip).
2.  **Extract**: Unzip the folder.
3.  **Launch**: Navigate to `bin/` and run `grafana-server.exe`.
4.  **Access UI**: Open [http://localhost:3000](http://localhost:3000) (Default: `admin` / `admin`).
    - *Note: If your frontend is already on 3000, you can change the Grafana port in `conf/defaults.ini` or use `docker-compose` if port conflicts persist.*

---

## 4. Connect Grafana to Prometheus

1.  Go to **Configuration** (cog icon) -> **Data Sources**.
2.  Click **Add data source** and select **Prometheus**.
3.  Set **URL** to `http://localhost:9090`.
4.  Click **Save & Test**.

---

## 5. Import Dashboard

1.  In Grafana, go to **Dashboards** -> **New** -> **Import**.
2.  Copy and paste the JSON content from [monitoring/grafana/provisioning/dashboards/sem-overview.json](file:///c:/Secure-Enviornment-Manager/monitoring/grafana/provisioning/dashboards/sem-overview.json).
3.  Select your **Prometheus** datasource and click **Import**.

---

## Summary of Ports
- **Backend (API)**: 8070
- **Frontend (UI)**: 3000
- **Prometheus (Scraper)**: 9090
- **Grafana (Visualization)**: 3001 (or 3000 if using different ports)

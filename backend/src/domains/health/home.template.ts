export interface HomePageData {
  uptime: number;
  nodeVersion: string;
  port: number;
  env: string;
  isRedisEnabled: boolean;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function renderHomePage(data: HomePageData): string {
  const uptimeStr = formatUptime(data.uptime);
  const redisBadge = data.isRedisEnabled
    ? '<span class="status-badge active"><span class="dot active"></span>Enabled (Cluster)</span>'
    : '<span class="status-badge neutral"><span class="dot neutral"></span>Standalone (In-Memory)</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEM — Secure Environment Manager API</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='10' fill='%231e1b4b'/%3E%3Cpath d='M12 18h16v12a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V18z' stroke='%23a78bfa' stroke-width='1.75' stroke-linejoin='round'/%3E%3Cpath d='M15 18V14a5 5 0 0 1 10 0v4' stroke='%23a78bfa' stroke-width='1.75' stroke-linecap='round'/%3E%3Ccircle cx='20' cy='25' r='1.75' fill='%23c4b5fd'/%3E%3C/svg%3E">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: #11141d;
      --card-border: #1e2433;
      --card-hover-border: #3b82f6;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --accent: #60a5fa;
      --emerald-bg: #064e3b;
      --emerald-border: #059669;
      --emerald-text: #34d399;
      --neutral-bg: #1e293b;
      --neutral-border: #334155;
      --neutral-text: #94a3b8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.5rem;
      line-height: 1.5;
    }
    .container {
      width: 100%;
      max-width: 1080px;
    }
    header {
      text-align: center;
      margin-bottom: 2.75rem;
    }
    .brand-row {
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background-color: #11141d;
      border: 1px solid var(--card-border);
      flex-shrink: 0;
    }
    .brand-meta {
      text-align: left;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.775rem;
      font-weight: 600;
      background-color: var(--emerald-bg);
      border: 1px solid var(--emerald-border);
      color: var(--emerald-text);
      margin-bottom: 1rem;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.active {
      background-color: var(--emerald-text);
    }
    .dot.neutral {
      background-color: var(--neutral-text);
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin-bottom: 0.65rem;
    }
    .subtitle {
      font-size: 1rem;
      color: var(--text-muted);
      max-width: 680px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.875rem;
      margin-bottom: 2.25rem;
    }
    .telemetry-card {
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 1rem 1.15rem;
      border-radius: 10px;
    }
    .telemetry-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      margin-bottom: 0.35rem;
    }
    .telemetry-value {
      font-size: 0.975rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
    }
    .status-badge.active {
      background-color: var(--emerald-bg);
      border: 1px solid var(--emerald-border);
      color: var(--emerald-text);
    }
    .status-badge.neutral {
      background-color: var(--neutral-bg);
      border: 1px solid var(--neutral-border);
      color: var(--neutral-text);
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #ffffff;
    }
    .section-title svg {
      stroke: var(--accent);
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
      margin-bottom: 2.25rem;
    }
    .nav-card {
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.35rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .nav-card:hover {
      background-color: #151a26;
      border-color: var(--card-hover-border);
    }
    .card-top {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      margin-bottom: 1rem;
    }
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background-color: #0b0f17;
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon svg {
      width: 20px;
      height: 20px;
      fill: var(--accent);
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .card-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.725rem;
      font-weight: 500;
      color: var(--accent);
      background-color: #1e293b;
      border: 1px solid #334155;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .card-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--card-border);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--accent);
    }
    .terminal-container {
      background-color: #05070a;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2.25rem;
    }
    .terminal-header {
      background-color: #0d1117;
      padding: 0.7rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
    }
    .terminal-dots {
      display: flex;
      gap: 6px;
    }
    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background-color: #ef4444; }
    .dot-yellow { background-color: #eab308; }
    .dot-green { background-color: #22c55e; }
    .terminal-title {
      font-size: 0.775rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--text-dim);
    }
    .copy-btn {
      background-color: #1e293b;
      border: 1px solid #334155;
      color: #f9fafb;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .copy-btn:hover {
      background-color: #334155;
    }
    .terminal-body {
      padding: 1.25rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: #e2e8f0;
      overflow-x: auto;
    }
    .comment { color: #64748b; }
    .cmd { color: #60a5fa; }
    .flags { color: #cbd5e1; }
    .str { color: #34d399; }
    .pills-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.65rem;
      margin-bottom: 2.5rem;
    }
    .feature-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 0.825rem;
      margin-top: auto;
      padding-top: 1.5rem;
      border-top: 1px solid var(--card-border);
      width: 100%;
    }
    footer a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.15s;
    }
    footer a:hover {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-row">
        <div class="logo-container">
          <!-- Official SEM Logo SVG from frontend/public/logo.svg -->
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SEM Logo">
            <rect width="40" height="40" rx="10" fill="#1e1b4b"/>
            <path d="M12 18h16v12a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V18z" stroke="#a78bfa" stroke-width="1.75" stroke-linejoin="round"/>
            <path d="M15 18V14a5 5 0 0 1 10 0v4" stroke="#a78bfa" stroke-width="1.75" stroke-linecap="round"/>
            <circle cx="20" cy="25" r="1.75" fill="#c4b5fd"/>
          </svg>
        </div>
        <div class="brand-meta">
          <div class="brand-title">SEM</div>
          <div class="brand-sub">Secure Environment Manager</div>
        </div>
      </div>
      <div>
        <div class="status-pill">
          <span class="dot active"></span>
          API Service Operational
        </div>
      </div>
      <h1>Secure Environment Manager API</h1>
      <p class="subtitle">
        Enterprise multi-tenant secrets management backend engine with AES-256-GCM envelope encryption, ES256 authentication, and zero-plaintext storage.
      </p>
    </header>

    <div class="telemetry-grid">
      <div class="telemetry-card">
        <div class="telemetry-label">Engine</div>
        <div class="telemetry-value">NestJS Fastify</div>
      </div>
      <div class="telemetry-card">
        <div class="telemetry-label">Encryption</div>
        <div class="telemetry-value" style="color: var(--accent);">AES-256-GCM</div>
      </div>
      <div class="telemetry-card">
        <div class="telemetry-label">Database</div>
        <div class="telemetry-value">PostgreSQL 16</div>
      </div>
      <div class="telemetry-card">
        <div class="telemetry-label">Cache / Queue</div>
        <div class="telemetry-value">${redisBadge}</div>
      </div>
      <div class="telemetry-card">
        <div class="telemetry-label">Server Uptime</div>
        <div class="telemetry-value">${uptimeStr}</div>
      </div>
      <div class="telemetry-card">
        <div class="telemetry-label">Runtime</div>
        <div class="telemetry-value">${data.nodeVersion}</div>
      </div>
    </div>

    <div class="section-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
      API Navigation &amp; Developer Tools
    </div>

    <div class="cards-grid">
      <a href="/api/docs" class="nav-card">
        <div>
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>
            </div>
            <div>
              <div class="card-title">
                API Docs (OpenAPI)
                <span class="card-path">/api/docs</span>
              </div>
              <p class="card-desc">Interactive Swagger UI documentation. Inspect models, test endpoints with Bearer tokens, and explore OpenAPI 3.0 specs.</p>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>Open Swagger Interface</span>
          <span>&rarr;</span>
        </div>
      </a>

      <a href="/healthz" class="nav-card">
        <div>
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-4-4h2.5V8h3v5H16l-4 4z"/></svg>
            </div>
            <div>
              <div class="card-title">
                Liveness Health Probe
                <span class="card-path">/healthz</span>
              </div>
              <p class="card-desc">Ultra-fast HTTP 200 liveness check designed for Kubernetes pod probes, Docker healthchecks, and uptime monitors.</p>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>View Liveness Status</span>
          <span>&rarr;</span>
        </div>
      </a>

      <a href="/readyz" class="nav-card">
        <div>
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div>
              <div class="card-title">
                Readiness Diagnostic
                <span class="card-path">/readyz</span>
              </div>
              <p class="card-desc">Deep dependency diagnostic inspecting PostgreSQL database connectivity, connection pooling, and cache availability.</p>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>Inspect Dependency Health</span>
          <span>&rarr;</span>
        </div>
      </a>

      <a href="/metrics" class="nav-card">
        <div>
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
            </div>
            <div>
              <div class="card-title">
                Prometheus Metrics
                <span class="card-path">/metrics</span>
              </div>
              <p class="card-desc">Prometheus text-format metrics exporter tracking request latencies, HTTP error rates, memory pools, and auth counters.</p>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>View Realtime Metrics</span>
          <span>&rarr;</span>
        </div>
      </a>

      <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" class="nav-card">
        <div>
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>
            </div>
            <div>
              <div class="card-title">
                Web Console (Frontend)
                <span class="card-path">:3000</span>
              </div>
              <p class="card-desc">Next.js 15 enterprise web console for managing projects, environments, secret variables, snapshots, and audit logs.</p>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>Launch Dashboard Console</span>
          <span>&nearr;</span>
        </div>
      </a>
    </div>

    <div class="section-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
      Developer Quickstart
    </div>

    <div class="terminal-container">
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="terminal-dot dot-red"></span>
          <span class="terminal-dot dot-yellow"></span>
          <span class="terminal-dot dot-green"></span>
        </div>
        <span class="terminal-title">bash &mdash; authenticate with master token</span>
        <button class="copy-btn" id="copy-btn" onclick="copySnippet()">Copy</button>
      </div>
      <div class="terminal-body" id="code-snippet">
<span class="comment"># 1. Authenticate with SEM V2 API</span>
<span class="cmd">curl</span> <span class="flags">-s -X POST</span> http://localhost:${data.port}/api/v1/auth/login \\
  <span class="flags">-H</span> <span class="str">"Content-Type: application/json"</span> \\
  <span class="flags">-d</span> <span class="str">'{"master_token":"YOUR_SEM_MASTER_TOKEN"}'</span>

<span class="comment"># 2. Query envelope-encrypted projects</span>
<span class="cmd">curl</span> <span class="flags">-s</span> http://localhost:${data.port}/api/v1/projects \\
  <span class="flags">-H</span> <span class="str">"Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</span>
      </div>
    </div>

    <div class="pills-container">
      <div class="feature-pill">AES-256-GCM Envelope Encryption</div>
      <div class="feature-pill">ES256 ECDSA Signed JWTs</div>
      <div class="feature-pill">Multi-Tenant Organization Scoping</div>
      <div class="feature-pill">Append-Only Audit Logs</div>
      <div class="feature-pill">Fastify Low-Latency Engine</div>
    </div>

    <footer>
      <p>Secure Environment Manager (SEM) V2 &bull; <a href="/api/docs">OpenAPI Documentation</a> &bull; Port ${data.port}</p>
    </footer>
  </div>

  <script>
    function copySnippet() {
      const text = \`curl -s -X POST http://localhost:${data.port}/api/v1/auth/login \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"master_token":"YOUR_SEM_MASTER_TOKEN"}'\`;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = 'Copied!';
        btn.style.borderColor = '#059669';
        btn.style.color = '#34d399';
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

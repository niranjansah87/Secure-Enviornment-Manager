# 13 — Advanced Web Performance & Core Web Vitals Optimization

**Document Code:** `SEO-PHASE-13`  
**System:** Secure Environment Manager (SEM)  
**Target Domain:** `https://sem.niranjansah87.com.np`  
**Measurement Framework:** Chrome User Experience Report (CrUX) Standards, Lighthouse v11, Next.js 15 Bundle Profiling  

---

## 1. Core Web Vitals Target Thresholds

| Metric | Google Standard ("Good") | SEM Architecture Target | Engineering Strategy |
| :--- | :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | $\le 2.5\text{s}$ | $< 1.8\text{s}$ | Prioritize SVG branding, pre-render initial typography in SSR pass, stream heavy 3D canvases. |
| **INP (Interaction to Next Paint)** | $\le 200\text{ms}$ | $< 100\text{ms}$ | Maintain lightweight main thread; isolate Three.js canvas execution outside UI critical thread. |
| **CLS (Cumulative Layout Shift)**  | $\le 0.1$ | $< 0.02$ | Set explicit aspect ratios on all interactive containers, video embeds, and terminal windows. |
| **FCP (First Contentful Paint)**  | $\le 1.8\text{s}$ | $< 1.2\text{s}$ | Zero render-blocking external scripts; Geist Variable fonts bundled locally (`next/font/local`). |
| **TTFB (Time to First Byte)**     | $\le 800\text{ms}$ | $< 250\text{ms}$ | Edge caching via Caddy/Nginx reverse proxy with gzip and brotli compression enabled. |

---

## 2. Asset & Bundle Optimization Analysis

### 2.1 Font Optimization via `next/font/local`
*   Geist Sans (`GeistVF.woff`) and Geist Mono (`GeistMonoVF.woff`) are stored locally in `frontend/src/app/fonts/`.
*   Zero external font requests to Google Fonts or third-party CDNs, preventing DNS lookup delays and layout shifts.
*   `font-display: swap` is automatically handled by Next.js font loader.

### 2.2 Script & 3D Execution Profiling
*   Three.js and `@react-three/fiber` components (`Dashboard3DShowcase`, `HeroPillars3D`, `HeroArtwork3D`) are wrapped inside dynamic client boundaries.
*   The page structure and copy render immediately without waiting for WebGL texture compilation, ensuring search bots capture text even if WebGL is disabled or slow.

### 2.3 Image Optimization Strategy
*   High-resolution PNG backgrounds in `frontend/public/` are kept out of the critical LCP path.
*   Above-the-fold brand identity uses vector SVG `/logo.png` with `priority` attribute.

---

## 3. Server-Side Response & Caching Architecture

*   **Production Reverse Proxy (Caddy / Nginx):**
    *   HTTP/2 and HTTP/3 support for multiplexed asset streaming.
    *   Aggressive caching headers for immutable static chunks:
        ```nginx
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
        ```
    *   Fastify API backend guarantees sub-10ms response times on health and metadata endpoints.

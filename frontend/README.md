# Secure Environment Manager - Frontend

The Secure Environment Manager frontend is a high-performance **Next.js 14 (App Router)** application. It provides a stunning, interactive 3D WebGL interface and a complex dashboard for secure environment variable management, version control, API token handling, and deeply integrated audit logging.

It connects securely to the centralized Python Flask backend.

## 🛠️ Technology Stack
* **Framework:** Next.js 14
* **Styling:** Tailwind CSS + shadcn/ui
* **Language:** TypeScript
* **3D Visuals:** Three.js + React Three Fiber / Drei
* **Animations:** Framer Motion
* **Tables:** TanStack React Table

## 🚀 Getting Started Locally

### 1. Configure the Environment
Ensure your `.env.local` points to your active Flask backend node.

```bash
cp .env.local.example .env.local
```

### 2. Install Packages
The application uses strict module resolution.

```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🐋 Production Deployment (Docker)
This repository is optimized for Next.js Standalone builds. It uses a **multi-stage Dockerfile** that prunes `node_modules` entirely, creating an incredibly lightweight Alpine-based production image.

Instead of running raw `npm`, use the provided `docker-compose.yml` located in the root of the project to orchestrate both the backend and frontend simultaneously:

```bash
cd ..
docker-compose up --build -d
```

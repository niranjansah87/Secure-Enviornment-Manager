# Usage Guide

The Secure Environment Manager (SEM) dashboard is the primary interface for managing your application's secrets and configurations.

## Accessing the Dashboard

1.  Open your browser and navigate to `http://localhost:3000`.
2.  Login with the password configured in your `.env` as `DASHBOARD_PASSWORD`.
3.  Choose a **Namespace** (e.g., `project-alpha`) and an **Environment** (e.g., `production`).

## Managing Secrets

### ➕ Creating a Secret
1.  Click the **Add Variable** button.
2.  Provide a **Key** (e.g., `DATABASE_URL`) and its **Value**.
3.  Click **Save**.

### ✏️ Updating a Secret
1.  Locate the secret in the list.
2.  Click the **Edit** icon next to its value.
3.  Update the secret and click **Save Changes**.

### 🗑️ Deleting a Secret
1.  Click the **Delete** icon next to the secret.
2.  Confirm the action in the popup. 

## Advanced Features

### 📤 Bulk Import
If you have an existing `.env` file, use the **Bulk Import** tool.
1.  Click **Bulk Actions** > **Import .env**.
2.  Paste the contents of your `.env` file into the editor.
3.  SEM will automatically parse and encrypt each variable individually.

### 💾 Multi-Format Export
You can export your secrets in various formats for integration with different tools:
*   **Dotenv (.env)**: For local development.
*   **JSON**: For server-side applications and integrations.
*   **YAML**: For CI/CD pipelines and Kubernetes.

### 📋 Using Templates
Bootstrap your environments quickly using built-in templates.
1.  Click **Templates** in the sidebar.
2.  Select a template (e.g., `Next.js Starter`, `FastAPI Base`).
3.  SEM will populate your environment with the standard keys for that framework.
4.  Variables marked as `__GENERATE__` will automatically receive a unique, secure random string.

### 📜 History & Rollback
SEM keeps a complete record of every version of your environment.
1.  Navigate to the **History** tab.
2.  Click **View Snapshot** to see the secrets as they were at that time.
3.  Use the **Diff** mode to compare changes between versions.
4.  Click **Rollback** to restore a previous version and make it the current "Source of Truth".

## Managing Access

> [!TIP]
> **API Keys**: You can generate API keys for specific namespaces to grant programmatic access to your CI/CD pipelines. This ensures that a build job for `project-alpha` cannot access secrets for `project-beta`.

---

Next: [API Reference](api-reference.md)

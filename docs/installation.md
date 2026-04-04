# Installation

Secure Environment Manager (SEM) is designed for flexibility. You can run it locally for development or deploy it in professional staging and production environments.

## Prerequisites

Before installing SEM, ensure your system meets the following requirements:

- **Python**: Version **3.10** or higher.
- **Node.js**: Version **18** or higher (for frontend development).
- **npm/yarn**: For managing frontend dependencies.
- **Docker** (Optional): For containerized deployment.

## Step 1: Clone the Repository

```bash
git clone https://github.com/niranjansah87/Secure-Enviornment-Manager.git
cd Secure-Enviornment-Manager
```

## Step 2: Backend Setup

1.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Generate Encryption Keys**:
    You need a strong `ENCRYPTION_KEY` and `FLASK_SECRET_KEY`. You can use the included script:
    ```bash
    python scripts/generate_keys.py
    ```
    This will output keys that you must copy into your `.env` file.

4.  **Configure Environment Variables**:
    Create a `.env` file in the root directory:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in the required values:
    *   `FLASK_SECRET_KEY`: Random string for session security.
    *   `ENCRYPTION_KEY`: A Fernet-compatible key (base64-encoded).
    *   `DASHBOARD_PASSWORD`: The password for web access.
    *   `MASTER_API_TOKEN`: A master token for full system API access.

5.  **Run the Backend**:
    ```bash
    python app.py
    ```
    The API will be available at `http://localhost:8070`.

## Step 3: Frontend Setup

1.  **Navigate to the Frontend Directory**:
    ```bash
    cd frontend
    ```

2.  **Install Node Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Frontend Environment**:
    Create a `frontend/.env.local` file:
    ```bash
    NEXT_PUBLIC_API_URL=http://localhost:8070
    ```

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The dashboard will be available at `http://localhost:3000`.

## Common Setup Mistakes

> [!WARNING]
> **Encryption Key Loss**: If you lose your `ENCRYPTION_KEY`, you **CANNOT** recover your secrets. Keep a secure backup of this key (e.g., in a password manager).

> [!IMPORTANT]
> **Python Version**: SEM uses modern Python features. Using a version lower than 3.10 will result in `TypeError` or `SyntaxError`.

> [!TIP]
> **CORS Configuration**: If the frontend cannot communicate with the backend, verify the `CORS_ORIGINS` setting in your backend `.env` file matches your frontend URL.

---

Next: [Usage Guide](usage.md)

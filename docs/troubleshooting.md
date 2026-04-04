# Troubleshooting

If you encounter issues while setting up or using Secure Environment Manager (SEM), this guide provides solutions to the most common problems.

## 🔴 Server Connection Errors

### "Network Error: Could not connect to the API"
-   **Cause**: The frontend cannot reach the backend server.
-   **Solution**:
    1.  Verify the backend is running (`python app.py` or check Docker status).
    2.  Check the `NEXT_PUBLIC_API_URL` variable in your `frontend/.env.local`. It should match your backend's host and port.
    3.  Verify your browser's console for CORS errors. Ensure `CORS_ORIGINS` in your backend `.env` includes your frontend URL.

## 🟠 Authentication Issues

### "Invalid Credentials" or "401 Unauthorized"
-   **Cause**: Incorrect password or expired session.
-   **Solution**:
    1.  Check the `DASHBOARD_PASSWORD` in your backend `.env`.
    2.  If using the CLI, verify your `API_TOKEN` exists and has access to the namespace.
    3.  Clear your browser's cookies and try logging in again.

### "Too Many Attempts: Locked Out"
-   **Cause**: 5 or more failed login attempts from your IP address.
-   **Solution**:
    1.  Wait for 15 minutes (default `LOCKOUT_MINUTES`).
    2.  If you have SSH access to the server, you can restart the backend to clear the in-memory lockout map.

## 🟡 Data Integrity Issues

### "Decryption Failed: Invalid Token"
-   **Cause**: The `ENCRYPTION_KEY` used to read the file does not match the key used to write it.
-   **Solution**:
    1.  Check your backend `.env` file and ensure the `ENCRYPTION_KEY` is correct.
    2.  If you have rotated your keys without migrating the data, your secrets are unrecoverable. Use the **History** feature or a backup if available.

### "JSON Decode Error"
-   **Cause**: The encrypted file has been manually edited or corrupted.
-   **Solution**:
    1.  Decrypting a manually modified file will result in a checksum failure (HMAC). Use a previous version from the `History` tab to restore the environment.

## 🟢 Monitoring & Logs

If problems persist, check the logs for detailed error messages:

-   **Backend Logs**: `app.log` (if configured) or the terminal output.
-   **Audit Logs**: Check the `audit_logs/` directory for a JSON-formatted trail of actions.
-   **Frontend Logs**: Run the frontend with `npm run dev` to see real-time console messages.

## 🕵️ Debug Mode

For a more verbose output, enable debug mode in your `.env`:
```bash
FLASK_DEBUG=true
LOG_LEVEL=DEBUG
```

> [!WARNING]
> **Security Risk**: Never enable `FLASK_DEBUG=true` in a production environment accessible from the public internet.

---

Next: [FAQ](faq.md)

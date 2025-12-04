# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create `.env` file with these required variables:**
   ```env
   FLASK_SECRET_KEY=your-secret-key-here
   ENCRYPTION_KEY=your-encryption-key-here
   DASHBOARD_PASSWORD=your-password-here
   SESSION_COOKIE_SECURE=false
   BEHIND_PROXY=false
   ```

3. **Generate encryption key:**
   ```bash
   python generate_keys.py
   ```
   Copy the output to your `.env` file as `ENCRYPTION_KEY`.

4. **Run the server:**
   ```bash
   python app.py
   ```

## Important: Session Cookie Settings

**For Local Development (HTTP):**
- Set `SESSION_COOKIE_SECURE=false` in your `.env` file
- This allows session cookies to work over HTTP (localhost)

**For Production (HTTPS):**
- Set `SESSION_COOKIE_SECURE=true` in your `.env` file
- Set `BEHIND_PROXY=true` if using a reverse proxy (Caddy/Nginx)

## URL Format

Access your environment variables using:
```
http://localhost:8070/<namespace>/<environment>
```

**Examples:**
- `http://localhost:8070/production/main`
- `http://localhost:8070/staging/dev`
- `http://localhost:8070/myapp/prod`

**NOT:** `/Dashboard/login` - This won't work correctly. Use the format above.

## Troubleshooting Login Redirect Issue

If login redirects back to login page:

1. **Check `.env` file** - Make sure `SESSION_COOKIE_SECURE=false` for local development
2. **Check browser console** - Look for cookie errors
3. **Check server logs** - Look for authentication messages
4. **Clear browser cookies** - Old session data might interfere

## API Usage

Create `api_keys.json`:
```json
{
  "namespace1": "your-api-token-here",
  "namespace2": "another-token-here"
}
```

Then use:
```bash
curl -H "Authorization: Bearer your-api-token-here" \
  http://localhost:8070/api/v1/namespace1/environment1
```


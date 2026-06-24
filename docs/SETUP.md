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

   # Optional - Admin Identity
   ADMIN_USERNAME=admin
   ADMIN_EMAIL=admin@example.com

   # Optional - Email (SMTP)
   EMAIL_SMTP_HOST=smtp.example.com
   EMAIL_SMTP_PORT=587
   EMAIL_SMTP_USER=your-email@example.com
   EMAIL_SMTP_PASSWORD=your-smtp-password
   EMAIL_FROM=noreply@your-domain.com
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
5. **User login issues**: Verify the user exists in `data/users.json` and status is "active". Check that the username is spelled correctly (case-insensitive match).

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

## User Management

Create user accounts for team members:

```bash
# Login as admin first
curl -X POST http://localhost:8070/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "your-dashboard-password", "namespace": "global", "environment": "main"}'

# Create a new user (use the JWT from login response)
curl -X POST http://localhost:8070/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-jwt>" \
  -d '{"username": "developer1", "role": "developer", "email": "dev@example.com", "scopes": ["production/main"]}'

# User logs in and sets new password
curl -X POST http://localhost:8070/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "developer1", "password": "<temp-password>", "namespace": "production", "environment": "main"}'

# Response includes must_change_password: true — user must call:
curl -X POST http://localhost:8070/api/v1/user/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{"new_password": "my-secure-password"}'
```


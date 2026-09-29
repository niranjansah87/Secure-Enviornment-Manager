# WORKFLOW.md

<!-- AUTO-GENERATED START -->
<!-- Development and operational workflows -->
<!-- AUTO-GENERATED END -->

## Development Workflows

### Local Development Setup

**Prerequisites:**
- Python 3.11+
- Node.js 20+
- Docker (for containerized development)

**Quick Start:**
```bash
# 1. Clone and install backend dependencies
pip install -r requirements.txt

# 2. Generate encryption key
python generate_keys.py
# Output: Paste ENCRYPTION_KEY=<generated_key> into .env

# 3. Create .env file
cat > .env << EOF
FLASK_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
ENCRYPTION_KEY=<from_step_2>
DASHBOARD_PASSWORD=your-secure-password
SESSION_COOKIE_SECURE=false
BEHIND_PROXY=false
EOF

# 4. Start backend
python app.py

# 5. In another terminal, start frontend
cd frontend
npm install
npm run dev
```

**Verify Setup:**
```bash
# Check backend health
curl http://localhost:8070/healthz

# Check frontend
open http://localhost:3000
```

### Feature Development Workflow

**1. Branch Creation:**
```bash
git checkout -b enhancement/my-new-feature
```

**2. Implementation:**
- Write code following patterns in `SKILLS.md`
- Keep functions small and focused
- Add type annotations (Python/TypeScript)

**3. Testing:**
```bash
# Backend: Manual API test
curl -H "Authorization: Bearer <token>" \
  http://localhost:8070/api/v1/testNamespace/testEnv

# Frontend: Build check
cd frontend && npm run build
```

**4. Linting:**
```bash
# Python linting
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Frontend linting
cd frontend && npm run lint
```

**5. Commit:**
```bash
git add .
git commit -m "feat: add new feature for secret management"
```

**6. Push and PR:**
```bash
git push -u origin enhancement/my-new-feature
gh pr create --title "feat: add new feature"
```

### Code Review Workflow

**Before Requesting Review:**
- [ ] Self-review changes in git diff
- [ ] Verify no sensitive data committed
- [ ] Check linting passes locally
- [ ] Test API endpoints with curl

**Review Response:**
- Address feedback in new commits
- Don't force-push to reviewed branches
- Re-request review after addressing comments

### Deployment Workflow

**Development Deployment (automatic):**
```bash
git push origin dev
# Triggers deploy.yml workflow
```

**Production Deployment:**
1. Create PR from `dev` to `main`
2. Get code review approval
3. Merge to `main`
4. Workflow deploys to production

**Manual Deployment:**
```bash
# SSH to server
ssh user@server

# Pull latest
cd /path/to/repo
git pull origin main

# Restart containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

## Operational Workflows

### Backup Workflow

**Data Backup:**
```bash
# Create timestamped backup
BACKUP_ID=$(date +%Y%m%d_%H%M%S)
cp -r data data_backup_${BACKUP_ID}
cp -r audit_logs audit_logs_backup_${BACKUP_ID}
```

**Restore from Backup:**
```bash
# Stop services
docker compose down

# Restore data
cp -r data_backup_${BACKUP_ID}/* data/
cp -r audit_logs_backup_${BACKUP_ID}/* audit_logs/

# Restart services
docker compose up -d
```

### Monitoring Workflow

**Check Service Health:**
```bash
curl http://localhost:8070/healthz
docker compose ps
```

**View Metrics:**
```bash
# Prometheus UI
open http://localhost:9095

# Grafana dashboard
open http://localhost:3002
```

**Check Logs:**
```bash
# Backend logs
docker compose logs backend --tail=100

# Frontend logs
docker compose logs frontend --tail=100
```

### Incident Response

**1. Identify Issue:**
```bash
# Check service status
curl http://localhost:8070/healthz

# Check recent logs
docker compose logs --tail=50
```

**2. Contain:**
```bash
# If issues found, stop affected services
docker compose stop backend

# Investigate before restarting
docker compose logs backend --tail=200 > incident_$(date +%s).log
```

**3. Resolve:**
- Apply fix or rollback
- Test health endpoint
- Verify all services operational

**4. Post-Incident:**
- Document root cause
- Add monitoring/alerting if gap found
- Update runbooks if procedures changed

### Encryption Key Rotation

**Current Limitation:** Not implemented. Requires manual process:

1. Export all secrets with current key
2. Generate new key
3. Update .env with new key
4. Re-encrypt all .enc files with new key
5. Clear session cookies
6. Distribute new key to team

**Recommended:** Implement automated key rotation before production.

## Git Workflow

### Branch Strategy

```
main (production)
 └── dev (staging)
      ├── enhancement/*
      ├── fix/*
      └── hotfix/*
```

### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Example:**
```
feat: add template application endpoint

Add POST /api/v1/:namespace/:environment/templates/apply
for applying predefined secret templates.

Closes #123
```

### Merge Conflict Handling

**1. Identify conflicts:**
```bash
git fetch origin
git merge origin/main
# or
git rebase origin/main
```

**2. Resolve conflicts:**
```bash
# Edit conflicted files
# Remove conflict markers
git add <resolved-files>
git commit
```

**3. Verify merge:**
```bash
python -c "import app"  # Backend still works
cd frontend && npm run build  # Frontend still builds
```

## Testing Workflow

### Manual API Testing

**List Environments:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8070/api/v1/meta/environments
```

**Create/Update Secret:**
```bash
curl -X PATCH -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"MY_SECRET":"my-value"}' \
  http://localhost:8070/api/v1/test/development
```

**Export Secrets:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8070/api/v1/test/development
```

**Bulk Import:**
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"payload":"KEY1=value1\nKEY2=value2"}' \
  http://localhost:8070/api/v1/test/development/bulk
```

### Manual UI Testing

**Login Flow:**
1. Open http://localhost:3000/login
2. Enter API token
3. Verify redirect to dashboard

**Secrets Management:**
1. Navigate to namespace/environment
2. Click "Add Secret"
3. Enter key and value
4. Verify appears in table
5. Click eye icon to unmask value
6. Edit value, verify change logged in audit

**History/Rollback:**
1. Make several changes
2. Go to History tab
3. Click on older snapshot
4. Verify values restored
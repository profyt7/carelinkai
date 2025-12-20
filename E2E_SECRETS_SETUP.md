# E2E Workflow GitHub Secrets Setup

## Overview
The E2E (End-to-End) workflow requires GitHub repository secrets to run Playwright tests in CI/CD. These secrets are currently missing, causing workflow failures.

## Required Secrets

### 1. E2E_NEXTAUTH_SECRET
**Purpose**: Authentication secret for NextAuth.js during E2E tests

**How to Generate**:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

**Example Value** (don't use this exact value):
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. E2E_DATABASE_URL
**Purpose**: PostgreSQL connection string for E2E test database

**Format**:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**Recommended Configuration**:

#### Option A: Use GitHub Actions PostgreSQL Service (Recommended)
The workflow already configures PostgreSQL as a service container. Use:
```
postgresql://postgres:postgres@localhost:5432/carelinkai_marketplace?schema=public
```

#### Option B: External Test Database
If you have a dedicated test database:
```
postgresql://test_user:test_password@your-db-host.com:5432/carelinkai_test?schema=public
```

**⚠️ Important**:
- Never use production database URL
- E2E tests create/destroy data - use isolated test database
- GitHub Actions service container is reset for each workflow run (safe)

## How to Add Secrets

### Step-by-Step Instructions

1. **Navigate to Repository Settings**
   - Go to: https://github.com/profyt7/carelinkai/settings/secrets/actions
   - Or: GitHub → profyt7/carelinkai → Settings → Secrets and variables → Actions

2. **Add E2E_NEXTAUTH_SECRET**
   - Click "New repository secret"
   - Name: `E2E_NEXTAUTH_SECRET`
   - Value: (paste generated secret from step above)
   - Click "Add secret"

3. **Add E2E_DATABASE_URL**
   - Click "New repository secret"
   - Name: `E2E_DATABASE_URL`
   - Value: `postgresql://postgres:postgres@localhost:5432/carelinkai_marketplace?schema=public`
   - Click "Add secret"

4. **Verify Secrets**
   - You should see both secrets listed (values are hidden)
   - ✓ E2E_NEXTAUTH_SECRET
   - ✓ E2E_DATABASE_URL

## Testing the Setup

### Trigger E2E Workflow Manually

1. **Go to Actions Tab**:
   - https://github.com/profyt7/carelinkai/actions

2. **Find E2E Workflow**:
   - Click "E2E (Residents + Family split)" in left sidebar

3. **Run Workflow**:
   - Click "Run workflow" button
   - Select `main` branch
   - Click "Run workflow"

4. **Monitor Progress**:
   - Watch the workflow run in real-time
   - Check for successful database connection
   - Verify Playwright tests execute

### Expected Results

✅ **Success Indicators**:
- "Prepare database schema" step completes
- "Build app" step succeeds
- Playwright tests run (may have test failures, but should execute)
- No authentication or database connection errors

❌ **Failure Indicators** (if secrets are wrong):
- "Error: NEXTAUTH_SECRET is required" in logs
- "Database connection failed" errors
- "Missing required environment variables" warnings

## Troubleshooting

### Issue: "NEXTAUTH_SECRET is required"
**Solution**: 
- Check secret name is exactly `E2E_NEXTAUTH_SECRET` (case-sensitive)
- Regenerate secret and update in GitHub settings
- Ensure secret value has no extra spaces or newlines

### Issue: "Database connection failed"
**Solution**:
- Verify `DATABASE_URL` format matches PostgreSQL connection string pattern
- Check PostgreSQL service is running (it's configured in workflow)
- Ensure database name matches: `carelinkai_marketplace`

### Issue: Tests fail with "Unable to connect to localhost:3000"
**Solution**:
- This indicates Next.js server didn't start
- Check build logs for compilation errors
- Verify all npm dependencies are installed

### Issue: Tests fail but secrets are correct
**Solution**:
- Some test failures are expected if application logic has changed
- Check specific test error messages in workflow logs
- Tests may need updates to match current UI/API behavior

## Workflow Files Using These Secrets

### `.github/workflows/e2e-family.yml`
Both `e2e-residents` and `e2e-family` jobs use:
```yaml
env:
  NEXTAUTH_SECRET: ${{ secrets.E2E_NEXTAUTH_SECRET }}
  DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
```

## Security Notes

⚠️ **Important Security Practices**:
1. Never commit secrets to Git
2. Never use production credentials for E2E tests
3. Rotate secrets if accidentally exposed
4. Use separate test database (isolated from production)
5. GitHub secrets are encrypted and only accessible during workflow runs

## Related Documentation
- `WORKFLOW_FIXES_SUMMARY.md`: Overview of all workflow fixes
- `WORKFLOW_CHANGES_PENDING.md`: Pending workflow file changes
- `.github/workflows/e2e-family.yml`: E2E workflow configuration

## Status Checklist

- [ ] E2E_NEXTAUTH_SECRET added to GitHub
- [ ] E2E_DATABASE_URL added to GitHub
- [ ] Secrets verified in repository settings
- [ ] E2E workflow triggered manually
- [ ] Workflow run completed (check for connection errors)
- [ ] Build step succeeded
- [ ] Playwright tests executed

---
**Created**: 2025-12-20
**Priority**: High (E2E tests cannot run without secrets)
**Estimated Setup Time**: 5 minutes

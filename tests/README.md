# CareLinkAI E2E Tests

Comprehensive end-to-end tests for the Role-Based Access Control (RBAC) system.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed Test Users

```bash
npx tsc --skipLibCheck prisma/seed-test-users.ts
node prisma/seed-test-users.js
```

### 3. Run Tests

```bash
# All tests
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# View report
npm run test:e2e:report
```

## Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin.test@carelinkai.com | TestPassword123! |
| Operator | operator.test@carelinkai.com | TestPassword123! |
| Caregiver | caregiver.test@carelinkai.com | TestPassword123! |
| Family | family.test@carelinkai.com | TestPassword123! |

## Test Files

- **auth.spec.ts** - Authentication and session management
- **residents.spec.ts** - Residents CRUD by role
- **assessments.spec.ts** - Assessments tab permissions
- **incidents.spec.ts** - Incidents tab permissions
- **compliance.spec.ts** - Compliance tab (restricted)
- **family.spec.ts** - Family contacts permissions
- **navigation.spec.ts** - Menu visibility by role
- **dashboard.spec.ts** - Dashboard actions by role

## Helpers

- **helpers/auth.ts** - Authentication utilities
- **fixtures/test-data.ts** - Test data and selectors

## Documentation

See [PLAYWRIGHT_TEST_GUIDE.md](../PLAYWRIGHT_TEST_GUIDE.md) for comprehensive documentation.

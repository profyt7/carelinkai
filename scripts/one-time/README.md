# One-time repair scripts (historical)

These scripts were run once to repair the production database. They are kept
for the record. **Do not add them back to `npm start` or the build.**

## `resolve-rolled-back-migrations.sh`

This script runs `prisma migrate resolve --rolled-back` on five migrations that
failed or were drafted in Dec 2025 / Jan 2026:

- `draft_add_document_processing`
- `20251220024025_phase1a_document_processing`
- `20251218162945_update_homes_to_active`
- `20251221011617_add_document_classification_validation`
- `20260107004129_add_impersonation_feature`

**Status:** already applied in production. Until OL-188 (2026-10-25) these five
commands ran on every boot as part of `npm run migrate:deploy`, so they have run
many times. Each run did nothing except take Prisma's advisory lock.

On 10/25 the auto-deploy of `777dee2b` hung after the first of these commands.
Render's start command then timed out with no port bound.

**When to run it:** only if `prisma migrate deploy` fails with P3009 ("migrate
found failed migrations") naming one of the five migrations above, for example
on a database restored from a pre-Jan-2026 backup. Run it by hand against that
database:

```bash
DATABASE_URL=... bash scripts/one-time/resolve-rolled-back-migrations.sh
```

Then deploy again.

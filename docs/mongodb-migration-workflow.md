# MongoDB Migration Workflow (Phase 1)

This repository now includes a **migration starter workflow** to move SQL/SQLite data into the new MongoDB domain model.

## What was added

- `scripts/mongodb/migrate-sqlite-to-mongo.ts`
  - Reads from PostgreSQL (`--source postgres`) or SQLite (`--source sqlite` via `sqlite3 -json`).
  - Maps legacy tables into target MongoDB collections:
    - `users`
    - `auth_credentials`
    - `auth_sessions`
    - `officer_refs`
    - `dispatch_refs`
    - `code21_forms`
    - `parking_areas`
    - `easypark_zones`
    - `addresses`
  - Writes collection exports as `ndjson` for staged import.
  - Supports `--dry-run` to emit row counts without writing files.
- `scripts/mongodb/index-manifest.js`
  - Centralized collection index manifest.
  - Optional helper `applyIndexes(db)` for applying indexes programmatically.

## Commands

Dry run from PostgreSQL:

```bash
npx tsx scripts/mongodb/migrate-sqlite-to-mongo.ts --source postgres --dry-run
```

Export from PostgreSQL:

```bash
npx tsx scripts/mongodb/migrate-sqlite-to-mongo.ts --source postgres --out scripts/mongodb/out
```

Dry run from SQLite:

```bash
npx tsx scripts/mongodb/migrate-sqlite-to-mongo.ts --source sqlite --sqlite-path ./legacy.sqlite --dry-run
```

Export from SQLite:

```bash
npx tsx scripts/mongodb/migrate-sqlite-to-mongo.ts --source sqlite --sqlite-path ./legacy.sqlite --out scripts/mongodb/out
```

## Workflow alignment with migration plan

1. Inventory and profile source SQL data (dry-run first).
2. Generate deterministic IDs and mapped output documents.
3. Inspect generated NDJSON for data-quality issues.
4. Import into MongoDB staging.
5. Apply the index manifest and run query validation.
6. Iterate on field mapping and reconciliation warnings.

## Notes

- This is **Phase 1 bootstrap**: extract + transform + index manifest.
- Recommended next step is a Phase 2 script for direct `bulkWrite` import into Mongo and reconciliation reports (duplicates, FK misses, timestamp parse failures).
- The script keeps compatibility with mixed legacy datetime formats and missing optional fields.

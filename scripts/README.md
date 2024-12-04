# Database Migration Scripts

This directory contains scripts for migrating data from the original Patient PSI application to the new Astro-based version.

## KV to PostgreSQL Migration

The `migrate-kv-to-postgres.ts` script migrates data from Vercel KV storage to PostgreSQL. It handles:

- Patient profiles
- Current patient selections
- Patient types
- Session assignments

### Prerequisites

1. Both the source (Vercel KV) and target (PostgreSQL) databases must be accessible
2. Environment variables must be set:
   - `DATABASE_URL`: PostgreSQL connection string
   - `KV_URL`: Vercel KV connection string
   - `KV_REST_API_URL`: Vercel KV REST API URL
   - `KV_REST_API_TOKEN`: Vercel KV REST API token
   - `KV_REST_API_READ_ONLY_TOKEN`: Vercel KV REST API read-only token

### Running the Migration

1. Build the TypeScript files:
   ```bash
   npm run build
   ```

2. Run the migration script:
   ```bash
   npm run migrate:kv-to-postgres
   ```

### Migration Process

The script performs the following steps:

1. Retrieves all keys from Vercel KV
2. Groups keys by type (profiles, current profiles, patient types, sessions)
3. Migrates profiles to the `patients` table
4. Updates current profile selections and patient types
5. Migrates session assignments to user metadata

### Verification

After migration, verify the data by:

1. Comparing record counts between KV and PostgreSQL
2. Checking a sample of migrated records
3. Testing the application with migrated data

### Rollback

There is no automatic rollback. To rollback:

1. Restore PostgreSQL from backup (if available)
2. Or truncate affected tables:
   ```sql
   TRUNCATE patients CASCADE;
   ```

### Troubleshooting

Common issues:

1. Connection errors:
   - Verify environment variables
   - Check network connectivity
   - Ensure database permissions

2. Data format issues:
   - Check KV data structure
   - Verify PostgreSQL schema compatibility

For support, check the error logs or contact the development team.

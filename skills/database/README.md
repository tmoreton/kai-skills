# Database Skill

Database operations including migrations, queries, schema inspection, and connection management.

## Tools

### db_migrate_run

Run database migrations with auto-detection of framework.

**Parameters:**
- `framework` - Migration framework (auto, prisma, typeorm, sequelize, knex, alembic, flyway)
- `direction` - Migration direction (up, down, latest)
- `count` - Number of migrations to run (for down)
- `dry_run` - Preview migrations without applying

### db_migrate_status

Show migration status and pending migrations.

**Parameters:**
- `framework` - Migration framework to use

### db_query

Execute SQL query with result formatting.

**Parameters:**
- `query` - SQL query to execute (required)
- `connection` - Database connection string (or use DATABASE_URL env var)
- `format` - Output format: table, json, csv
- `max_rows` - Maximum rows to return (default: 100)

### db_schema_inspect

Inspect database schema and generate types/docs.

**Parameters:**
- `tables` - Specific tables to inspect (all if empty)
- `format` - Output format: markdown, json, typescript, prisma
- `include_data` - Include sample data

### db_backup

Create database backup.

**Parameters:**
- `format` - Backup format: sql, json, csv
- `tables` - Specific tables to backup
- `compress` - Compress backup file (default: true)

### db_seed

Seed database with test data.

**Parameters:**
- `environment` - Environment to seed (development, test, staging)
- `reset` - Reset data before seeding

## Auto-Detection

The skill automatically detects the following frameworks:
- **Prisma**: `prisma/schema.prisma`
- **TypeORM**: `ormconfig.json` or `src/data-source.ts`
- **Sequelize**: `config/config.json` or `models/` directory
- **Knex**: `knexfile.js` or `knexfile.ts`
- **Alembic**: `alembic.ini`
- **Flyway**: `src/main/resources/db/migration/`

## Usage Examples

```javascript
// Run migrations
{ "tool": "db_migrate_run", "framework": "prisma" }

// Check migration status
{ "tool": "db_migrate_status" }

// Execute a query
{ "tool": "db_query", "query": "SELECT * FROM users LIMIT 10" }

// Inspect schema
{ "tool": "db_schema_inspect", "format": "typescript" }

// Create backup
{ "tool": "db_backup", "format": "sql", "compress": true }

// Seed database
{ "tool": "db_seed", "environment": "development" }
```

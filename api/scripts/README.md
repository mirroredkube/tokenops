# Database Migration Scripts

This directory contains scripts for migrating data between different database schemas.

## Backup Data Migration

### Overview

The `migrate-backup-data.ts` script migrates user data from the old schema backup to the new Organization → Product → Asset hierarchy schema.

### What Gets Migrated

- **Users**: 3 users from the backup file
- **User Settings**: 1 user settings record
- **Role Mapping**: Old `user` role → New `VIEWER` role
- **Organization Assignment**: All users assigned to "Default Organization"

### What Gets Skipped

- **Empty Tables**: Asset, Authorization, ComplianceRecord, Issuance (no data to migrate)
- **Existing Records**: Users that already exist in the new schema

### Prerequisites

1. **Default Organization**: Must exist (run seed script first)
2. **Database**: Must be migrated to new schema
3. **Backup File**: Data extracted from `backup_20250831_123712.sql`

### Usage

```bash
# Run the migration
pnpm run db:migrate-backup

# Or run directly
pnpm tsx scripts/migrate-backup-data.ts
```

### Migration Process

1. **Verification**: Checks for default organization
2. **User Migration**: 
   - Maps old roles to new UserRole enum
   - Assigns users to default organization
   - Preserves original user IDs and timestamps
3. **Settings Migration**: Migrates user preferences and settings
4. **Verification**: Counts total records for validation

### Expected Output

```
🔄 Starting backup data migration...
🏢 Ensuring default organization exists...
✅ Default organization found: Default Organization
📋 Parsing backup user data...
📊 Found 3 users and 1 user settings
👥 Migrating users...
✅ Migrated user: anitha.ramaswamy.2015@gmail.com (VIEWER)
✅ Migrated user: povordinary@gmail.com (VIEWER)
✅ Migrated user: aramaswa2005@gmail.com (VIEWER)
⚙️  Migrating user settings...
✅ Migrated settings for user: cmeyp0f1d00003dz6d5n1b0j0

📊 Migration Summary:
👥 Users: 3 migrated, 0 skipped
⚙️  Settings: 1 migrated, 0 skipped
✅ Migration completed successfully!

🔍 Verifying migration...
📈 Total users in database: 3
📈 Total user settings in database: 1
```

### Data Mapping

#### User Role Mapping
- `user` → `VIEWER`
- `admin` → `ADMIN` (if present)

#### User Status
- All users set to `ACTIVE`

#### Organization Assignment
- All users assigned to "Default Organization"

### Safety Features

- **Idempotent**: Safe to run multiple times
- **Duplicate Prevention**: Skips existing users
- **Error Handling**: Continues on individual record failures
- **Verification**: Reports migration statistics

### Troubleshooting

#### "Default organization not found"
```bash
# Run the seed script first
pnpm prisma db seed
```

#### "User already exists"
- This is expected behavior
- The script will skip existing users
- Check the migration summary for counts

#### Database connection issues
```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://..."
```

### Verification Commands

After migration, verify the data:

```bash
# Check users
pnpm tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.user.findMany({ include: { organization: true } }).then(users => { console.log('Users:', users.map(u => ({ email: u.email, role: u.role, org: u.organization.name }))); prisma.\$disconnect(); });"

# Check user settings
pnpm tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.userSettings.findMany().then(settings => { console.log('Settings:', settings); prisma.\$disconnect(); });"
```

### Rollback

If needed, you can manually delete migrated users:

```bash
# Delete migrated users (use with caution)
pnpm tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.user.deleteMany({ where: { email: { in: ['anitha.ramaswamy.2015@gmail.com', 'povordinary@gmail.com', 'aramaswa2005@gmail.com'] } } }).then(() => { console.log('Users deleted'); prisma.\$disconnect(); });"
```

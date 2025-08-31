# Database Seeding

This directory contains the database seeding configuration for the TokenOps platform.

## Overview

The seed script (`seed.ts`) provides essential foundation data for a new TokenOps installation:

- **Default Organization**: Required for backward compatibility and initial setup
- **Regulatory Regimes**: EU MiCA and Travel Rule compliance frameworks
- **Requirement Templates**: Pre-configured compliance rules for different scenarios
- **Development Data**: Optional sample data for development environments

## Usage

### Basic Seeding

```bash
# Run the seed script
pnpm prisma db seed

# Or use the direct command
pnpm run db:seed
```

### Environment Configuration

The seed script supports environment-based configuration:

```bash
# Organization settings
DEFAULT_ORG_NAME="My Organization"
DEFAULT_ORG_COUNTRY="US"
DEFAULT_ORG_JURISDICTION="US"

# Regulatory data (default: true)
ENABLE_REGULATORY_DATA=true
ENABLE_REQUIREMENT_TEMPLATES=true

# Development data (default: false in production)
ENABLE_DEV_DATA=true
NODE_ENV=development
```

## What Gets Seeded

### 1. Regulatory Regimes
- **EU MiCA** (`mica-eu-v1`): Markets in Crypto-Assets Regulation
- **EU Travel Rule** (`travel-rule-eu-v1`): Crypto-asset transfer regulations

### 2. Requirement Templates (9 total)
- **MiCA Requirements**: Issuer authorization, whitepaper, KYC, withdrawal rights, marketing
- **Travel Rule Requirements**: Information payload, self-hosted wallet transfers
- **Ledger-Specific**: XRPL trustline auth, EVM allowlist gating

### 3. Default Organization
- **Name**: "Default Organization" (configurable)
- **Country**: "US" (configurable)
- **Status**: ACTIVE

### 4. Development Data (optional)
- **Sample Product**: Created only in development mode
- **Asset Class**: OTHER
- **Policy Presets**: Includes KYC requirements

## Production Considerations

### Minimal Production Setup
```bash
# Disable development data in production
ENABLE_DEV_DATA=false
NODE_ENV=production

# Customize organization details
DEFAULT_ORG_NAME="Your Company Name"
DEFAULT_ORG_COUNTRY="US"
DEFAULT_ORG_JURISDICTION="US"
```

### Regulatory Compliance
The seed script includes EU regulatory frameworks by default. For other jurisdictions:

1. **Disable regulatory data**: `ENABLE_REGULATORY_DATA=false`
2. **Add custom regimes**: Modify `seed.ts` to include your jurisdiction's requirements
3. **Custom templates**: Add requirement templates specific to your compliance needs

## Integration with CI/CD

### Docker/Container Setup
```dockerfile
# In your Dockerfile
COPY prisma/seed.ts ./prisma/
RUN pnpm prisma db seed
```

### Database Migrations
The seed script is designed to be idempotent and safe to run multiple times:
- Uses `upsert` operations to avoid duplicates
- Checks for existing data before creating
- Safe for production environments

## Troubleshooting

### Common Issues

1. **Seed script not found**
   ```bash
   # Ensure prisma seed is configured in package.json
   "prisma": {
     "seed": "tsx prisma/seed.ts"
   }
   ```

2. **TypeScript errors**
   - The script may show TypeScript warnings about `process` but runs correctly
   - These are cosmetic and don't affect functionality

3. **Database connection issues**
   ```bash
   # Ensure DATABASE_URL is set
   export DATABASE_URL="postgresql://..."
   ```

### Verification

After seeding, verify the data:
```bash
# Check organizations
pnpm tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.organization.findMany().then(orgs => { console.log('Organizations:', orgs); prisma.\$disconnect(); });"

# Check regimes
pnpm tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.regime.findMany().then(regimes => { console.log('Regimes:', regimes); prisma.\$disconnect(); });"
```

## Customization

### Adding New Regimes
1. Add regime data to the `requirementTemplates` array
2. Include appropriate enforcement hints for your ledgers
3. Update applicability expressions as needed

### Adding Custom Organizations
1. Modify the `SEED_CONFIG` object
2. Add environment variables for customization
3. Consider adding multiple organizations for multi-tenant setups

### Extending Requirement Templates
1. Follow the existing pattern in the `requirementTemplates` array
2. Include proper `enforcementHints` for your target ledgers
3. Use appropriate `applicabilityExpr` for conditional application

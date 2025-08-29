# Compliance Management UI

## Overview

The Compliance Management UI provides a comprehensive interface for managing compliance records in the token registry. This feature allows users (compliance officers, auditors, and regulators) to view, verify, and manage compliance records with full audit trails.

**Note**: Compliance records are automatically created during the token issuance flow when users fill in compliance metadata. This management UI provides oversight and verification capabilities for those existing records.

## Features

### 1. Compliance Records List (`/compliance`)

- **View all compliance records** with pagination and filtering
- **Filter by status**: Unverified, Verified, Rejected
- **Filter by asset ID** and holder address
- **Real-time status indicators** with color-coded badges
- **Quick access** to record details

### 2. Compliance Record Details (`/compliance/[recordId]`)

- **Complete record information** including all metadata
- **Verification workflow** for auditors and regulators
- **Related issuances** that reference the compliance record
- **Audit trail** with timestamps and verification details
- **Copy-to-clipboard** functionality for IDs and hashes

### 3. Verification Workflow

- **Verify or reject** compliance records
- **Required reasoning** for rejections
- **Warning system** for records referenced by issuances
- **Audit logging** of all verification actions

## API Endpoints

### Compliance Records

#### `GET /v1/compliance-records`
List all compliance records with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Records per page (default: 20, max: 100)
- `status` (string): Filter by status (UNVERIFIED, VERIFIED, REJECTED)
- `assetId` (string): Filter by asset ID
- `holder` (string): Filter by holder address

**Response:**
```json
{
  "records": [
    {
      "id": "string",
      "recordId": "string",
      "assetId": "string",
      "assetRef": "string",
      "holder": "string",
      "status": "UNVERIFIED|VERIFIED|REJECTED",
      "sha256": "string",
      "createdAt": "string",
      "verifiedAt": "string",
      "verifiedBy": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### `POST /v1/compliance-records`
Create a new compliance record.

**Request Body:**
```json
{
  "assetId": "string",
  "holder": "string",
  "isin": "string (optional)",
  "legalIssuer": "string (optional)",
  "jurisdiction": "string (optional)",
  "micaClass": "string (optional)",
  "kycRequirement": "string (optional)",
  "transferRestrictions": "boolean (default: false)",
  "purpose": "string (optional)",
  "docs": "array (optional)",
  "consentTs": "string (optional)"
}
```

#### `GET /v1/compliance-records/{recordId}`
Get detailed information about a specific compliance record.

**Response:**
```json
{
  "id": "string",
  "recordId": "string",
  "assetId": "string",
  "assetRef": "string",
  "holder": "string",
  "sha256": "string",
  "status": "string",
  "verifiedAt": "string",
  "verifiedBy": "string",
  "reason": "string",
  "isin": "string",
  "legalIssuer": "string",
  "jurisdiction": "string",
  "micaClass": "string",
  "kycRequirement": "string",
  "transferRestrictions": "boolean",
  "purpose": "string",
  "docs": "array",
  "consentTs": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### `PATCH /v1/compliance-records/{recordId}/verify`
Verify or reject a compliance record (auditor/regulator only).

**Request Body:**
```json
{
  "status": "VERIFIED|REJECTED",
  "reason": "string (required for rejections)"
}
```

### Related Issuances

#### `GET /v1/issuances/by-compliance/{recordId}`
Get all issuances that reference a specific compliance record.

**Response:**
```json
{
  "issuances": [
    {
      "id": "string",
      "assetId": "string",
      "assetRef": "string",
      "to": "string",
      "amount": "string",
      "txId": "string",
      "explorer": "string",
      "status": "string",
      "createdAt": "string"
    }
  ]
}
```

## Database Schema

### ComplianceRecord Model

```sql
CREATE TABLE "ComplianceRecord" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL UNIQUE,
  "assetId" TEXT NOT NULL,
  "holder" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "status" "ComplianceStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "reason" TEXT,
  
  -- Compliance metadata
  "isin" TEXT,
  "legalIssuer" TEXT,
  "jurisdiction" TEXT,
  "micaClass" TEXT,
  "kycRequirement" TEXT,
  "transferRestrictions" BOOLEAN NOT NULL DEFAULT false,
  "purpose" TEXT,
  "docs" JSONB,
  "consentTs" TIMESTAMP(3),
  
  -- Audit fields
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);
```

## User Roles and Permissions

### Current Implementation
- **All users** can view compliance records
- **System verification** is used for verification actions
- **Future enhancement**: Role-based access control (RBAC)

### Planned RBAC Implementation
- **Viewer**: Can view compliance records
- **Compliance Officer**: Can verify/reject records
- **Regulator**: Full access to all compliance functions
- **Admin**: Full system access

## Security Features

### Data Integrity
- **SHA256 hashing** of compliance records for integrity verification
- **Canonical JSON** formatting to ensure consistent hashing
- **Immutable audit trail** of all verification actions

### Privacy Protection
- **Redacted responses** for public endpoints (planned)
- **Access logging** for all compliance operations
- **Encrypted storage** of sensitive compliance data (planned)

## Testing

### Automated Tests
Run the compliance management test suite:

```bash
./test/test-compliance-ui.sh
```

### Manual Testing
1. Start the API server: `cd api && pnpm dev`
2. Start the web server: `cd web && pnpm dev`
3. Navigate to `http://localhost:3000/compliance`
4. Test the UI functionality

### Creating Test Data
To create compliance records for testing:

1. **Via Token Issuance Flow** (Recommended):
   - Go to `http://localhost:3000/issuance`
   - Follow the asset-centric issuance process
   - Fill in compliance metadata when prompted
   - View the created records in the compliance management UI

2. **Via API** (For testing purposes):
   ```bash
   curl -X POST http://localhost:3001/v1/compliance-records \
     -H "Content-Type: application/json" \
     -d '{
       "assetId": "your_asset_id",
       "holder": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
       "isin": "TEST123456789",
       "legalIssuer": "Test Corp",
       "jurisdiction": "DE",
       "micaClass": "Utility Token",
       "kycRequirement": "optional",
       "purpose": "Testing"
     }'
   ```

## Future Enhancements

### Phase 2 Features
- **Bulk verification** of multiple records
- **Compliance report generation** (PDF/CSV)
- **Integration with external compliance databases**
- **Real-time compliance monitoring** and alerts
- **Advanced filtering** and search capabilities

### Phase 3 Features
- **Multi-jurisdiction compliance** support
- **Automated compliance checking** based on rules
- **Compliance scoring** and risk assessment
- **Integration with regulatory reporting systems**

## Troubleshooting

### Common Issues

1. **Compliance record not found**
   - Verify the record ID is correct
   - Check if the record exists in the database

2. **Verification fails**
   - Ensure you have proper permissions
   - Check that the record status is UNVERIFIED
   - Verify the request body format

3. **Related issuances not showing**
   - Check if any issuances reference the compliance record
   - Verify the compliance record ID in issuance metadata

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
DEBUG=compliance:* npm run dev
```

## Support

For issues or questions about the Compliance Management UI:
1. Check the troubleshooting section above
2. Review the API documentation
3. Contact the development team

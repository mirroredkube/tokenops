# Issuance and Authorization Flow Diagram

## Complete Flow Overview

*See `issuance-authorization-flow.mermaid` for the complete flow diagram.*

## User Roles and Access Patterns

### 🏢 **Platform Users (Issuers)**
- **Access**: Full platform access with authentication
- **Role**: Create assets, authorization requests, and token issuances
- **Authentication**: Required (JWT cookies, Google OAuth, etc.)
- **Actions**: 
  - Create authorization requests for external holders
  - Issue tokens to authorized holders
  - Monitor issuance status and compliance

### 👤 **External Holders**
- **Access**: No platform access - external users
- **Role**: Receive and authorize trustlines for token issuance
- **Authentication**: None required - use one-time authorization tokens
- **Actions**:
  - Receive authorization links via email/SMS
  - Authorize trustlines via XUMM wallet or XRPL
  - No platform login or account creation needed

## Key Components

### 1. Authorization Flow
- **Authorization Request**: Created by platform issuer for external holder
- **One-time Token**: Generated for secure authorization (no platform login required)
- **External Holder Authorization**: Via XUMM wallet or direct XRPL transaction
- **Trustline Creation**: If not exists, created during authorization
- **Issuer Authorization**: Final step to authorize the trustline (platform user)

### 2. Issuance Flow
- **PENDING Issuance**: Created first, waits for authorization
- **SUBMITTED Issuance**: Direct issuance with pre-flight checks
- **Pre-flight Checks**: Verify trustline exists and limits
- **Compliance**: Generate manifest and hash for audit trail
- **XRPL Transaction**: Actual token issuance on blockchain

### 3. Status Management
- **Authorization Status**: PENDING → CONSUMED → ISSUER_AUTHORIZED
- **Issuance Status**: PENDING → SUBMITTED → VALIDATED/FAILED
- **Watcher Job**: Monitors XRPL transactions for final status

## Current Issues Identified

### 1. **No Data in System**
```
Checking 0 submitted issuances
```
- Database appears empty
- No test data or seed data present

### 2. **Authorization Flow Issues**
- Authorization requests may not be properly linked to issuances
- Trustline creation process needs verification

### 3. **XRPL Integration**
- XRPL status checks working (200 responses)
- But actual transactions may be failing due to:
  - Missing trustlines
  - Invalid issuer addresses
  - Network connectivity issues

### 4. **Tenant Isolation**
- Data might not be properly scoped to tenants
- Default tenant setup needs verification

## Recommended Next Steps

1. **Check Database State**: Verify seed data and tenant setup
2. **Test Authorization Flow**: Create test authorization request
3. **Verify Trustlines**: Check XRPL testnet trustline setup
4. **Test Issuance Flow**: Attempt simple token issuance
5. **Monitor Logs**: Check for specific error messages in XRPL transactions

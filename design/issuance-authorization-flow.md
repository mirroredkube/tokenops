# Issuance and Authorization Flow Diagram

## Complete Flow Overview

```mermaid
graph TB
    %% Platform Users (Issuers)
    Issuer[🏢 Issuer/Platform User] --> CreateAuth[Create Authorization Request]
    Issuer --> CreateIssuance[Create Token Issuance]
    
    %% External Holders
    Holder[👤 External Holder<br/>No Platform Access] --> ReceiveAuth[Receive Authorization Link<br/>via Email/SMS/etc]
    
    %% Authorization Flow
    CreateAuth --> AuthReq[Authorization Request<br/>Status: PENDING]
    AuthReq --> AuthToken[Generate Authorization Token<br/>One-time use token]
    AuthToken --> AuthURL[Authorization URL<br/>/auth/authorize/{token}]
    AuthURL --> SendLink[Send Authorization Link<br/>to External Holder]
    
    %% External Holder Authorization
    ReceiveAuth --> AuthURL
    SendLink --> HolderAuth[External Holder Authorization<br/>via XUMM/Wallet<br/>No Platform Login Required]
    HolderAuth --> TrustlineCheck{Trustline<br/>Exists?}
    
    TrustlineCheck -->|No| CreateTrustline[Create Trustline<br/>on XRPL]
    TrustlineCheck -->|Yes| AuthComplete[Authorization Complete<br/>Status: CONSUMED]
    CreateTrustline --> AuthComplete
    
    %% Issuer Authorization
    AuthComplete --> IssuerAuth[Issuer Authorization<br/>via API]
    IssuerAuth --> IssuerAuthTx[Issuer Authorization<br/>Transaction on XRPL]
    IssuerAuthTx --> AuthRecord[Authorization Record<br/>Status: ISSUER_AUTHORIZED]
    
    %% Issuance Flow
    CreateIssuance --> IssuanceCheck{Issuance Type?}
    IssuanceCheck -->|PENDING| PendingIssuance[Pending Issuance<br/>Status: PENDING]
    IssuanceCheck -->|SUBMITTED| SubmittedIssuance[Submitted Issuance<br/>Status: SUBMITTED]
    
    %% Pending Issuance Flow
    PendingIssuance --> LinkAuth[Link to Authorization<br/>if exists]
    LinkAuth --> WaitAuth[Wait for Authorization<br/>to complete]
    WaitAuth --> AuthRecord
    
    %% Submitted Issuance Flow
    SubmittedIssuance --> PreflightCheck[Pre-flight Checks]
    PreflightCheck --> TrustlineExists{Trustline<br/>Exists?}
    TrustlineExists -->|No| Error1[❌ Error: Trustline Required]
    TrustlineExists -->|Yes| CheckLimit{Amount ≤<br/>Trustline Limit?}
    CheckLimit -->|No| Error2[❌ Error: Exceeds Limit]
    CheckLimit -->|Yes| ComplianceCheck[Compliance Evaluation]
    
    %% Compliance Flow
    ComplianceCheck --> ComplianceManifest[Generate Compliance<br/>Manifest]
    ComplianceManifest --> ComplianceHash[Generate Manifest Hash]
    ComplianceHash --> XRPLTx[XRPL Transaction<br/>Payment/TrustSet]
    
    %% XRPL Transaction
    XRPLTx --> TxResult{Transaction<br/>Success?}
    TxResult -->|Success| IssuanceComplete[✅ Issuance Complete<br/>Status: VALIDATED]
    TxResult -->|Failed| IssuanceFailed[❌ Issuance Failed<br/>Status: FAILED]
    
    %% Status Updates
    IssuanceComplete --> UpdateStatus[Update Issuance Status<br/>with TX ID]
    IssuanceFailed --> UpdateFailed[Update Issuance Status<br/>with Error]
    
    %% Watcher Job
    UpdateStatus --> WatcherJob[Issuance Watcher Job<br/>Monitor TX Status]
    WatcherJob --> FinalStatus[Final Status Update<br/>VALIDATED/FAILED]
    
    %% Styling
    classDef userAction fill:#e1f5fe
    classDef process fill:#f3e5f5
    classDef decision fill:#fff3e0
    classDef success fill:#e8f5e8
    classDef error fill:#ffebee
    classDef xrpl fill:#fff8e1
    
    class User,CreateAuth,CreateIssuance userAction
    class AuthReq,AuthToken,AuthURL,AuthComplete,AuthRecord,PendingIssuance,SubmittedIssuance,ComplianceManifest,ComplianceHash process
    class TrustlineCheck,IssuanceCheck,TrustlineExists,CheckLimit,TxResult decision
    class IssuanceComplete,FinalStatus success
    class Error1,Error2,IssuanceFailed error
    class CreateTrustline,IssuerAuthTx,XRPLTx,WatcherJob xrpl
```

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

# UI/UX Alignment Plan for Asset-Centric API

**Date:** 2025-08-28  
**Status:** In Progress

---

## 🎯 **Overview**

This document outlines the comprehensive plan to align the UI/UX with our new asset-centric API architecture. The goal is to create a seamless, enterprise-ready interface that follows the asset → opt-in → compliance → issuance workflow.

---

## 🔍 **Current State Analysis**

### **❌ Issues Identified:**

#### **1. API Mismatch**
- **TokenIssuanceFlow** uses old endpoints (`/opt-in/check`, `/opt-in/setup`)
- **Opt-in page** uses old `/opt-in/setup` endpoint
- **No asset management** - Missing asset creation/management UI
- **No compliance workflow** - Missing compliance record creation/verification

#### **2. Workflow Misalignment**
- **Current flow**: Ledger → Opt-in → Issue → Compliance → Success
- **New API flow**: Asset → Opt-in → Compliance → Issue → Success
- **Missing asset step** - No asset creation/selection in UI

#### **3. Data Model Mismatch**
- **Old**: Direct currency/issuer/holder management
- **New**: Asset-centric with `assetId`, `assetRef`, compliance modes
- **Missing**: Asset lifecycle management (draft → active → paused → retired)

---

## 🚀 **Implementation Plan**

### **Phase 1: Asset Management UI** 🏗️

#### **✅ Completed:**
- **Asset List Page** (`/app/assets/page.tsx`)
  - Asset listing with filtering (ledger, status)
  - Asset status indicators and actions
  - Links to create, view, edit, and issue assets

- **Asset Creation Page** (`/app/assets/create/page.tsx`)
  - Comprehensive asset creation form
  - Ledger selection (XRPL, Hedera, Ethereum)
  - Compliance mode configuration
  - Registry metadata (ISIN, LEI, MiCA, jurisdiction)
  - Ledger-specific controls (freeze, clawback, auth)

#### **🔄 In Progress:**
- **Asset Details Page** (`/app/assets/[id]/page.tsx`)
  - Asset information display
  - Opt-ins list for this asset
  - Issuances list for this asset
  - Asset lifecycle management (activate, pause, retire)

- **Asset Edit Page** (`/app/assets/[id]/edit/page.tsx`)
  - Edit draft assets only
  - Update compliance settings
  - Modify ledger controls

### **Phase 2: Updated Token Issuance Flow** 🔄

#### **🔄 Planned Changes:**

**Current TokenIssuanceFlow.tsx:**
```typescript
// OLD: Direct ledger/currency approach
Step 1: Ledger Selection (XRPL, Hedera, Ethereum)
Step 2: Trustline Check (currency, holder, issuer)
Step 3: Token Issuance (amount, destination)
Step 4: Compliance Metadata (optional)
Step 5: Success
```

**NEW: Asset-Centric Approach:**
```typescript
// NEW: Asset-centric workflow
Step 1: Asset Selection (or create new)
Step 2: Opt-In Check/Setup (per asset)
Step 3: Compliance Record (if GATED_BEFORE mode)
Step 4: Token Issuance (with compliance anchoring)
Step 5: Success/Status
```

#### **Key Changes:**
1. **Asset Selection Step**
   - Dropdown of available assets
   - "Create New Asset" option
   - Asset details preview

2. **Updated Data Models**
   ```typescript
   interface Asset {
     id: string
     assetRef: string
     ledger: string
     network: string
     issuer: string
     code: string
     decimals: number
     complianceMode: 'OFF' | 'RECORD_ONLY' | 'GATED_BEFORE'
     status: 'draft' | 'active' | 'paused' | 'retired'
   }

   interface OptInData {
     assetId: string
     holder: string
     limit?: string
   }

   interface IssuanceData {
     assetId: string
     to: string
     amount: string
     complianceRef?: {
       recordId: string
       sha256: string
     }
   }
   ```

3. **API Endpoint Updates**
   ```typescript
   // OLD endpoints to remove:
   api.POST('/opt-in/check', ...)
   api.POST('/opt-in/setup', ...)
   api.POST('/tokens/issue', ...)

   // NEW endpoints to use:
   api.GET('/v1/assets') // List assets
   api.GET('/v1/assets/{assetId}/opt-ins/{holder}') // Check opt-in
   api.PUT('/v1/assets/{assetId}/opt-ins/{holder}') // Create opt-in
   api.POST('/v1/compliance-records') // Create compliance
   api.POST('/v1/assets/{assetId}/issuances') // Issue tokens
   ```

### **Phase 3: Compliance Management UI** 📜

#### **🔄 Planned Implementation:**

**Compliance Records Page** (`/app/compliance/page.tsx`)
- List compliance records with filtering
- Create new compliance records
- Compliance verification workflow

**Compliance Creation Flow** (`/app/compliance/create/page.tsx`)
- Step 1: Select asset and holder
- Step 2: Fill compliance data (jurisdiction, MiCA, KYC, etc.)
- Step 3: Review and create
- Step 4: Get recordId and sha256 for issuance

**Compliance Verification** (`/app/compliance/[id]/verify/page.tsx`)
- Auditor/regulator interface
- Verify or reject compliance records
- Add verification notes

### **Phase 4: Updated Navigation & Dashboard** 🧭

#### **🔄 Planned Changes:**

**New Navigation Structure:**
```typescript
Dashboard
├── Assets
│   ├── List Assets (/app/assets)
│   ├── Create Asset (/app/assets/create)
│   └── Asset Details (/app/assets/[id])
├── Token Issuance
│   └── Asset Selection → Opt-In → Compliance → Issue
├── Compliance
│   ├── Create Records (/app/compliance/create)
│   ├── List Records (/app/compliance)
│   └── Verify Records (/app/compliance/[id]/verify)
├── Opt-Ins
│   └── Manage per Asset (/app/opt-in)
└── Reports
    └── Asset Issuances
```

**Updated Dashboard** (`/app/dashboard/page.tsx`)
- Asset overview (count by status)
- Recent issuances per asset
- Compliance records status
- System health

### **Phase 5: API Integration Updates** 🔌

#### **🔄 Planned Changes:**

**Update API Client** (`/src/lib/api.ts`)
- Add new v1 endpoints
- Remove old endpoints
- Update TypeScript types

**Update Components**
- TokenIssuanceFlow → use new asset-centric endpoints
- OptInPage → use `/v1/assets/{assetId}/opt-ins/{holder}`
- Add asset selection/management
- Add compliance workflow

---

## 📋 **Detailed Implementation Tasks**

### **Task 1: Update TokenIssuanceFlow Component**
- [ ] Add asset selection step
- [ ] Update data models to use assetId
- [ ] Replace old API calls with new v1 endpoints
- [ ] Add compliance workflow integration
- [ ] Update step navigation and validation

### **Task 2: Create Asset Details Page**
- [ ] Display asset information
- [ ] Show opt-ins for this asset
- [ ] Show issuances for this asset
- [ ] Add asset lifecycle management
- [ ] Add quick actions (issue, edit, etc.)

### **Task 3: Create Compliance Management Pages**
- [ ] Compliance records list page
- [ ] Compliance creation flow
- [ ] Compliance verification interface
- [ ] Integration with issuance workflow

### **Task 4: Update Navigation**
- [ ] Add assets section to navigation
- [ ] Update dashboard with asset overview
- [ ] Add compliance section
- [ ] Update breadcrumbs and routing

### **Task 5: Update API Integration**
- [ ] Update all components to use v1 endpoints
- [ ] Remove old endpoint usage
- [ ] Update TypeScript types
- [ ] Add error handling for new endpoints

### **Task 6: Update Opt-In Page**
- [ ] Make it asset-centric
- [ ] Use new API endpoints
- [ ] Add asset selection
- [ ] Update data models

---

## 🎯 **Success Criteria**

### **✅ Functional Requirements:**
- [ ] Users can create and manage assets
- [ ] Token issuance follows asset → opt-in → compliance → issue workflow
- [ ] Compliance records can be created and verified
- [ ] All API calls use new v1 endpoints
- [ ] Asset lifecycle management works (draft → active → paused → retired)

### **✅ UX Requirements:**
- [ ] Intuitive asset-centric navigation
- [ ] Clear workflow progression
- [ ] Proper error handling and validation
- [ ] Responsive design across devices
- [ ] Loading states and feedback

### **✅ Technical Requirements:**
- [ ] TypeScript types match API schemas
- [ ] No old API endpoint usage
- [ ] Proper error handling
- [ ] Idempotency support in UI
- [ ] Async operation feedback (202 Accepted)

---

## 🚀 **Next Steps**

### **Immediate (This Week):**
1. **Complete Asset Details Page** - Show asset info, opt-ins, issuances
2. **Update TokenIssuanceFlow** - Add asset selection, use new APIs
3. **Create Compliance Pages** - Basic compliance management

### **Short Term (Next Week):**
1. **Update Navigation** - Add assets and compliance sections
2. **Update Dashboard** - Asset overview and recent activity
3. **Update Opt-In Page** - Make it asset-centric

### **Medium Term (Next Sprint):**
1. **Polish UX** - Loading states, error handling, validation
2. **Add Advanced Features** - Asset editing, compliance verification
3. **Testing** - End-to-end workflow testing

---

## 📊 **Progress Tracking**

- [x] **Phase 1: Asset Management UI** - 60% complete
  - [x] Asset List Page
  - [x] Asset Creation Page
  - [ ] Asset Details Page
  - [ ] Asset Edit Page

- [ ] **Phase 2: Token Issuance Flow** - 0% complete
  - [ ] Update TokenIssuanceFlow component
  - [ ] Add asset selection
  - [ ] Update API integration

- [ ] **Phase 3: Compliance Management** - 0% complete
  - [ ] Compliance records page
  - [ ] Compliance creation flow
  - [ ] Compliance verification

- [ ] **Phase 4: Navigation & Dashboard** - 0% complete
  - [ ] Update navigation structure
  - [ ] Update dashboard
  - [ ] Add breadcrumbs

- [ ] **Phase 5: API Integration** - 0% complete
  - [ ] Update all components
  - [ ] Remove old endpoints
  - [ ] Update TypeScript types

**Overall Progress: 12% Complete**

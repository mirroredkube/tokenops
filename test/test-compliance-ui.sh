#!/bin/bash

# Test script for Compliance Management UI
# This script tests the compliance record management functionality
# Note: Compliance records are created during the token issuance flow

set -e

echo "🧪 Testing Compliance Management UI"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL="http://localhost:3001"

echo -e "${YELLOW}Note: Compliance records are created during token issuance flow${NC}"
echo -e "${YELLOW}This test focuses on the management UI functionality${NC}"
echo ""

echo -e "${YELLOW}1. Testing compliance records listing...${NC}"

# List compliance records
LIST_RESPONSE=$(curl -s -X GET "${API_URL}/v1/compliance-records")

if echo "$LIST_RESPONSE" | grep -q "error"; then
  echo -e "${RED}✗ Failed to list compliance records${NC}"
  echo "$LIST_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Compliance records listed successfully${NC}"
  RECORD_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "Total records: $RECORD_COUNT"
fi

# If no records exist, create a test record
if [ "$RECORD_COUNT" = "0" ]; then
  echo -e "${YELLOW}No compliance records found. Creating a test record...${NC}"
  
  # First, create a test asset if it doesn't exist
  echo "Creating test asset..."
  ASSET_RESPONSE=$(curl -s -X POST "${API_URL}/v1/assets" \
    -H "Content-Type: application/json" \
    -d '{
      "ledger": "xrpl",
      "network": "testnet",
      "issuer": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "code": "TEST",
      "decimals": 6,
      "complianceMode": "RECORD_ONLY"
    }')

  if echo "$ASSET_RESPONSE" | grep -q "error"; then
    echo -e "${YELLOW}Asset might already exist, continuing...${NC}"
  else
    echo -e "${GREEN}✓ Test asset created${NC}"
  fi

  # Extract asset ID from response or use a default
  ASSET_ID=$(echo "$ASSET_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  if [ -z "$ASSET_ID" ]; then
    ASSET_ID="test_asset_123"
  fi

  # Create a compliance record
  echo "Creating test compliance record..."
  COMPLIANCE_RESPONSE=$(curl -s -X POST "${API_URL}/v1/compliance-records" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test_compliance_$(date +%s)" \
    -d '{
      "assetId": "'$ASSET_ID'",
      "holder": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "isin": "TEST123456789",
      "legalIssuer": "Test Financial Corp",
      "jurisdiction": "DE",
      "micaClass": "Utility Token",
      "kycRequirement": "optional",
      "transferRestrictions": false,
      "purpose": "Testing compliance management"
    }')

  if echo "$COMPLIANCE_RESPONSE" | grep -q "error"; then
    echo -e "${RED}✗ Failed to create compliance record${NC}"
    echo "$COMPLIANCE_RESPONSE"
    exit 1
  else
    echo -e "${GREEN}✓ Test compliance record created${NC}"
    TEST_RECORD_ID=$(echo "$COMPLIANCE_RESPONSE" | grep -o '"recordId":"[^"]*"' | cut -d'"' -f4)
    echo "Record ID: $TEST_RECORD_ID"
  fi
else
  # Extract a record ID from existing records
  TEST_RECORD_ID=$(echo "$LIST_RESPONSE" | grep -o '"recordId":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ Using existing compliance record: $TEST_RECORD_ID${NC}"
fi

echo -e "${YELLOW}2. Testing compliance record details...${NC}"

# Get specific compliance record
if [ -n "$TEST_RECORD_ID" ]; then
  DETAIL_RESPONSE=$(curl -s -X GET "${API_URL}/v1/compliance-records/${TEST_RECORD_ID}")
  
  if echo "$DETAIL_RESPONSE" | grep -q "error"; then
    echo -e "${RED}✗ Failed to get compliance record details${NC}"
    echo "$DETAIL_RESPONSE"
    exit 1
  else
    echo -e "${GREEN}✓ Compliance record details retrieved${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No test record ID available, skipping details test${NC}"
fi

echo -e "${YELLOW}3. Testing compliance record verification...${NC}"

# Verify the compliance record
if [ -n "$TEST_RECORD_ID" ]; then
  VERIFY_RESPONSE=$(curl -s -X PATCH "${API_URL}/v1/compliance-records/${TEST_RECORD_ID}/verify" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "VERIFIED"
    }')
  
  if echo "$VERIFY_RESPONSE" | grep -q "error"; then
    echo -e "${RED}✗ Failed to verify compliance record${NC}"
    echo "$VERIFY_RESPONSE"
    exit 1
  else
    echo -e "${GREEN}✓ Compliance record verified successfully${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No test record ID available, skipping verification test${NC}"
fi

echo -e "${YELLOW}4. Testing related issuances endpoint...${NC}"

# Test the related issuances endpoint
if [ -n "$TEST_RECORD_ID" ]; then
  ISSUANCES_RESPONSE=$(curl -s -X GET "${API_URL}/v1/issuances/by-compliance/${TEST_RECORD_ID}")
  
  if echo "$ISSUANCES_RESPONSE" | grep -q "error"; then
    echo -e "${RED}✗ Failed to get related issuances${NC}"
    echo "$ISSUANCES_RESPONSE"
    exit 1
  else
    echo -e "${GREEN}✓ Related issuances endpoint working${NC}"
    ISSUANCE_COUNT=$(echo "$ISSUANCES_RESPONSE" | grep -o '"issuances":\[[^]]*\]' | grep -o '\[.*\]' | jq 'length' 2>/dev/null || echo "0")
    echo "Related issuances: $ISSUANCE_COUNT"
  fi
else
  echo -e "${YELLOW}⚠ No test record ID available, skipping issuances test${NC}"
fi

echo -e "${YELLOW}5. Testing filtering functionality...${NC}"

# Test filtering by status
FILTER_RESPONSE=$(curl -s -X GET "${API_URL}/v1/compliance-records?status=VERIFIED")

if echo "$FILTER_RESPONSE" | grep -q "error"; then
  echo -e "${RED}✗ Failed to filter compliance records${NC}"
  echo "$FILTER_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Filtering functionality working${NC}"
  FILTERED_COUNT=$(echo "$FILTER_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "Verified records: $FILTERED_COUNT"
fi

echo ""
echo -e "${GREEN}🎉 All compliance management tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the API server: cd api && pnpm dev"
echo "2. Start the web server: cd web && pnpm dev"
echo "3. Navigate to http://localhost:3000/compliance"
echo "4. Test the UI functionality"
echo ""
echo "Note: To create more compliance records, use the token issuance flow:"
echo "1. Go to http://localhost:3000/issuance"
echo "2. Follow the asset-centric issuance process"
echo "3. Fill in compliance metadata when prompted"
echo "4. View the created records in the compliance management UI"

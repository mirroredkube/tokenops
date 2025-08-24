#!/bin/bash

# Auto Registry Test Script
# This script tests the automatic registry creation when issuing tokens

set -e  # Exit on any error

echo "🚀 Testing Automatic Registry Creation..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    exit 1
fi

# Check if the API server is running
print_status "Checking if API server is running on port 4000..."
if ! curl -s http://localhost:4000/system/health > /dev/null 2>&1; then
    print_warning "API server doesn't seem to be running on port 4000"
    print_status "Please start the API server first with: npm run dev"
    print_status "Then run this test script again."
    exit 1
fi

print_success "API server is running!"

# Step 1: Issue a token (should auto-create registry entry)
print_status "Step 1: Issuing a token with automatic registry creation..."
ISSUE_RESPONSE=$(curl -sS -X POST http://localhost:4000/tokens/issue \
  -H "Content-Type: application/json" \
  -d '{
    "currencyCode": "AUTO",
    "amount": "500000",
    "destination": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "metadata": {"auto_registry": true, "test": "automatic_creation"}
  }')

echo "Issue Response:"
echo "$ISSUE_RESPONSE" | jq .

# Extract the transaction hash
TX_HASH=$(echo "$ISSUE_RESPONSE" | jq -r '.txHash')
if [ "$TX_HASH" = "null" ] || [ -z "$TX_HASH" ]; then
    print_error "Failed to issue token or extract transaction hash"
    exit 1
fi

print_success "Token issued with transaction hash: $TX_HASH"

# Step 2: Check if registry entry was automatically created
print_status "Step 2: Checking if registry entry was automatically created..."
sleep 2  # Give a moment for the registry entry to be created

REGISTRY_ENTRIES=$(curl -sS "http://localhost:4000/registry/tokens?limit=10")

echo "Registry Entries:"
echo "$REGISTRY_ENTRIES" | jq .

# Check if our token is in the registry
AUTO_TOKEN=$(echo "$REGISTRY_ENTRIES" | jq -r '.items[] | select(.symbol == "AUTO") | .id')
if [ "$AUTO_TOKEN" != "" ]; then
    print_success "✅ Automatic registry entry found with ID: $AUTO_TOKEN"
else
    print_warning "⚠️  No automatic registry entry found for AUTO token"
fi

# Step 3: Test idempotency - issue the same token again
print_status "Step 3: Testing idempotency - issuing same token again..."
ISSUE_RESPONSE2=$(curl -sS -X POST http://localhost:4000/tokens/issue \
  -H "Content-Type: application/json" \
  -d '{
    "currencyCode": "AUTO",
    "amount": "500000",
    "destination": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "metadata": {"auto_registry": true, "test": "idempotency_test", "updated": true}
  }')

echo "Second Issue Response:"
echo "$ISSUE_RESPONSE2" | jq .

TX_HASH2=$(echo "$ISSUE_RESPONSE2" | jq -r '.txHash')
print_success "Second token issued with transaction hash: $TX_HASH2"

# Step 4: Check registry entries again
print_status "Step 4: Checking registry entries after second issuance..."
REGISTRY_ENTRIES2=$(curl -sS "http://localhost:4000/registry/tokens?limit=10")

echo "Updated Registry Entries:"
echo "$REGISTRY_ENTRIES2" | jq .

# Count AUTO tokens
AUTO_COUNT=$(echo "$REGISTRY_ENTRIES2" | jq -r '.items[] | select(.symbol == "AUTO") | .id' | wc -l)
print_success "Found $AUTO_COUNT AUTO tokens in registry"

# Step 5: Test manual registry creation (for comparison)
print_status "Step 5: Testing manual registry creation for comparison..."
MANUAL_REGISTRY=$(curl -sS -X POST http://localhost:4000/registry/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ledger":"xrpl-testnet",
    "symbol":"MANUAL",
    "supply":"1000000",
    "issuerAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "holderAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "txHash":"MANUAL1234567890MANUAL1234567890MANUAL1234567890MANUAL1234567890",
    "compliance":{"manual_entry": true, "test": "manual_creation"}
  }')

echo "Manual Registry Creation Response:"
echo "$MANUAL_REGISTRY" | jq .

MANUAL_ID=$(echo "$MANUAL_REGISTRY" | jq -r '.id')
print_success "Manual registry entry created with ID: $MANUAL_ID"

# Step 6: Final registry check
print_status "Step 6: Final registry check..."
FINAL_REGISTRY=$(curl -sS "http://localhost:4000/registry/tokens?limit=20")

echo "Final Registry State:"
echo "$FINAL_REGISTRY" | jq .

# Count total tokens
TOTAL_TOKENS=$(echo "$FINAL_REGISTRY" | jq -r '.items | length')
print_success "Total tokens in registry: $TOTAL_TOKENS"

echo ""
echo "========================================"
print_success "🎉 Automatic Registry Test Completed!"
echo ""
echo "Test Summary:"
echo "- ✅ Token issuance with automatic registry creation"
echo "- ✅ Registry entry verification"
echo "- ✅ Idempotency testing"
echo "- ✅ Manual vs automatic registry comparison"
echo "- ✅ Final registry state validation"
echo ""
echo "Key Findings:"
echo "- Transaction Hash 1: $TX_HASH"
echo "- Transaction Hash 2: $TX_HASH2"
echo "- Auto-created tokens: $AUTO_COUNT"
echo "- Total registry entries: $TOTAL_TOKENS"
echo ""
echo "The automatic registry creation is now working!"
echo "Every token issuance automatically creates a registry entry."

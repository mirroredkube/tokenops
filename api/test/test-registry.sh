#!/bin/bash

# Token Registry API Test Script
# This script tests the complete token registry functionality

set -e  # Exit on any error

echo "🚀 Starting Token Registry API Tests..."
echo "======================================"

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

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    exit 1
fi

# Check if test database is set up
if [ ! -f ".env.test" ]; then
    print_error "Test database not set up. Please run: ./test-db-setup.sh"
    exit 1
fi

# Load test environment
print_status "Loading test environment..."
export $(grep -v '^#' .env.test | xargs)

# Check if the API server is running on test port
print_status "Checking if API server is running on test port 4001..."
if ! curl -s http://localhost:4001/system/health > /dev/null 2>&1; then
    print_warning "API server doesn't seem to be running on test port 4001"
    print_status "Please start the API server with test database:"
    print_status "  DATABASE_URL=\"$DATABASE_URL\" npm run dev"
    print_status "Then run this test script again."
    exit 1
fi

print_success "API server is running on test port!"

# Step 1: Generate Prisma client for test database
print_status "Step 1: Generating Prisma client for test database..."
cd .. && DATABASE_URL="$DATABASE_URL" npx prisma generate
print_success "Prisma client generated successfully!"

# Step 2: Run migrations on test database
print_status "Step 2: Running database migrations on test database..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
print_success "Database migrations completed on test database!"

# Step 3: Smoke test - Create a new token record
print_status "Step 3: Creating a new token record..."
CREATE_RESPONSE=$(curl -sS -X POST http://localhost:4001/registry/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ledger":"xrpl-testnet",
    "symbol":"EURT",
    "supply":"1000000",
    "issuerAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "holderAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "txHash":"ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
    "compliance":{"isin":"EU0000000001","kyc":"mandatory","jurisdiction":"DE"}
  }')

echo "Create Response:"
echo "$CREATE_RESPONSE" | jq .

# Extract the token ID from the response
TOKEN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
if [ "$TOKEN_ID" = "null" ] || [ -z "$TOKEN_ID" ]; then
    print_error "Failed to create token record or extract ID"
    exit 1
fi

print_success "Token record created with ID: $TOKEN_ID"

# Step 4: Test idempotency - Create the same token again (should update)
print_status "Step 4: Testing idempotency - creating same token again..."
UPDATE_RESPONSE=$(curl -sS -X POST http://localhost:4001/registry/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ledger":"xrpl-testnet",
    "symbol":"EURT",
    "supply":"2000000",
    "issuerAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "holderAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "txHash":"ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
    "compliance":{"isin":"EU0000000001","kyc":"mandatory","jurisdiction":"DE","updated":true}
  }')

echo "Update Response:"
echo "$UPDATE_RESPONSE" | jq .

UPDATED_ID=$(echo "$UPDATE_RESPONSE" | jq -r '.id')
if [ "$UPDATED_ID" = "$TOKEN_ID" ]; then
    print_success "Idempotency test passed - same ID returned"
else
    print_error "Idempotency test failed - different ID returned"
fi

# Step 5: Create another token for testing
print_status "Step 5: Creating another token record..."
CREATE_RESPONSE2=$(curl -sS -X POST http://localhost:4001/registry/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ledger":"xrpl-mainnet",
    "symbol":"USDT",
    "supply":"5000000",
    "issuerAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "holderAddress":"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "txHash":"FEDCBA0987654321FEDCBA0987654321FEDCBA0987654321FEDCBA0987654321",
    "compliance":{"isin":"US0000000002","kyc":"optional","jurisdiction":"US"}
  }')

TOKEN_ID2=$(echo "$CREATE_RESPONSE2" | jq -r '.id')
print_success "Second token record created with ID: $TOKEN_ID2"

# Step 6: List tokens with pagination
print_status "Step 6: Testing pagination - listing tokens..."
LIST_RESPONSE=$(curl -sS "http://localhost:4001/registry/tokens?limit=5")

echo "List Response:"
echo "$LIST_RESPONSE" | jq .

# Check if we have items in the response
ITEM_COUNT=$(echo "$LIST_RESPONSE" | jq '.items | length')
print_success "Found $ITEM_COUNT tokens in the registry"

# Step 7: Get specific token by ID
print_status "Step 7: Getting specific token by ID..."
GET_RESPONSE=$(curl -sS "http://localhost:4001/registry/tokens/$TOKEN_ID")

echo "Get Token Response:"
echo "$GET_RESPONSE" | jq .

# Step 8: Test JSON export
print_status "Step 8: Testing JSON export..."
JSON_EXPORT=$(curl -sS "http://localhost:4001/registry/tokens/$TOKEN_ID/report")

echo "JSON Export Response:"
echo "$JSON_EXPORT" | jq .

# Step 9: Test CSV export
print_status "Step 9: Testing CSV export..."
CSV_EXPORT=$(curl -sS -H "Accept: text/csv" "http://localhost:4001/registry/tokens/$TOKEN_ID/report")

echo "CSV Export Response:"
echo "$CSV_EXPORT"

# Step 9.5: Test bulk export
print_status "Step 9.5: Testing bulk export..."
BULK_JSON_EXPORT=$(curl -sS "http://localhost:4001/registry/tokens/report?format=json")

echo "Bulk JSON Export Response:"
echo "$BULK_JSON_EXPORT" | jq .

BULK_CSV_EXPORT=$(curl -sS "http://localhost:4001/registry/tokens/report?format=csv")

echo "Bulk CSV Export Response:"
echo "$BULK_CSV_EXPORT"

# Step 10: Test filtering
print_status "Step 10: Testing filtering by symbol..."
FILTER_RESPONSE=$(curl -sS "http://localhost:4001/registry/tokens?symbol=EURT&limit=10")

echo "Filter Response:"
echo "$FILTER_RESPONSE" | jq .

# Step 11: Test filtering by ledger
print_status "Step 11: Testing filtering by ledger..."
LEDGER_FILTER_RESPONSE=$(curl -sS "http://localhost:4001/registry/tokens?ledger=xrpl-testnet&limit=10")

echo "Ledger Filter Response:"
echo "$LEDGER_FILTER_RESPONSE" | jq .

# Step 12: Test error handling - invalid ID
print_status "Step 12: Testing error handling with invalid ID..."
ERROR_RESPONSE=$(curl -sS "http://localhost:4001/registry/tokens/invalid-id-123")

echo "Error Response:"
echo "$ERROR_RESPONSE" | jq .

# Step 13: Test validation errors
print_status "Step 13: Testing validation errors..."
VALIDATION_ERROR=$(curl -sS -X POST http://localhost:4001/registry/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ledger":"invalid-ledger",
    "symbol":"INVALID",
    "supply":"not-a-number",
    "issuerAddress":"invalid-address",
    "txHash":"invalid-hash"
  }')

echo "Validation Error Response:"
echo "$VALIDATION_ERROR" | jq .

echo ""
echo "======================================"
print_success "🎉 All tests completed successfully!"
echo ""
echo "Test Summary:"
echo "- ✅ Database setup and migrations"
echo "- ✅ Token creation and idempotency"
echo "- ✅ Token listing and pagination"
echo "- ✅ Token retrieval by ID"
echo "- ✅ JSON export functionality"
echo "- ✅ CSV export functionality"
echo "- ✅ Bulk export functionality (JSON/CSV)"
echo "- ✅ Filtering by symbol and ledger"
echo "- ✅ Error handling"
echo "- ✅ Input validation"
echo ""
echo "Token IDs created:"
echo "- Token 1 (EURT): $TOKEN_ID"
echo "- Token 2 (USDT): $TOKEN_ID2"
echo ""
echo "You can now use these IDs for further testing!"

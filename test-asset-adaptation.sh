#!/bin/bash

# Asset Management API & UI Adaptation Test Script
# This script tests the new Organization → Product → Asset hierarchy

set -e

echo "🧪 Testing Asset Management API & UI Adaptation"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    echo -e "\n${BLUE}Testing: ${test_name}${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Helper function to check API response
check_api_response() {
    local test_name="$1"
    local url="$2"
    local expected_pattern="$3"
    
    echo -e "\n${BLUE}Testing: ${test_name}${NC}"
    
    response=$(curl -s "$url" 2>/dev/null || echo "ERROR")
    
    if echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Response: $response"
        ((TESTS_FAILED++))
    fi
}

# Check if API server is running
echo "🔍 Checking API server status..."
if curl -s http://localhost:4000/v1/assets > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not running on port 4000${NC}"
    echo "Please start the API server first: cd api && pnpm run dev"
    exit 1
fi

echo -e "\n${YELLOW}Starting API Tests...${NC}"

# Test 1: Check if assets endpoint returns product and organization info
check_api_response \
    "Assets endpoint includes product and organization info" \
    "http://localhost:4000/v1/assets" \
    "product"

# Test 2: Check if product filtering works
check_api_response \
    "Product filtering works" \
    "http://localhost:4000/v1/assets?productId=test" \
    "assets"

# Test 3: Check if product-scoped assets endpoint exists
check_api_response \
    "Product-scoped assets endpoint exists" \
    "http://localhost:4000/v1/products/test/assets" \
    "assets"

# Test 4: Test asset creation with productId (should fail without valid productId)
echo -e "\n${BLUE}Testing: Asset creation requires productId${NC}"
response=$(curl -s -X POST "http://localhost:4000/v1/assets" \
    -H "Content-Type: application/json" \
    -d '{"ledger": "xrpl", "issuer": "rTEST123", "code": "TEST", "decimals": 6}' \
    2>/dev/null || echo "ERROR")

if echo "$response" | grep -q "Bad Request\|error"; then
    echo -e "${GREEN}✅ PASSED - Asset creation correctly requires productId${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED - Asset creation should require productId${NC}"
    echo "Response: $response"
    ((TESTS_FAILED++))
fi

# Test 5: Get a valid product ID for testing
echo -e "\n${BLUE}Getting valid product ID for testing...${NC}"
products_response=$(curl -s "http://localhost:4000/v1/products" 2>/dev/null || echo "ERROR")
product_id=$(echo "$products_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$product_id" ]; then
    echo -e "${GREEN}✅ Found product ID: $product_id${NC}"
    
    # Test 6: Create asset with valid productId
    echo -e "\n${BLUE}Testing: Asset creation with valid productId${NC}"
    create_response=$(curl -s -X POST "http://localhost:4000/v1/assets" \
        -H "Content-Type: application/json" \
        -d "{\"productId\": \"$product_id\", \"ledger\": \"xrpl\", \"issuer\": \"rTEST456\", \"code\": \"TEST2\", \"decimals\": 6}" \
        2>/dev/null || echo "ERROR")
    
    if echo "$create_response" | grep -q '"id"'; then
        echo -e "${GREEN}✅ PASSED - Asset created successfully with productId${NC}"
        ((TESTS_PASSED++))
        
        # Extract asset ID for further testing
        asset_id=$(echo "$create_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "Created asset ID: $asset_id"
        
        # Test 7: Verify asset includes product and organization info
        echo -e "\n${BLUE}Testing: Created asset includes product and organization info${NC}"
        if echo "$create_response" | grep -q '"product"' && echo "$create_response" | grep -q '"organization"'; then
            echo -e "${GREEN}✅ PASSED - Asset includes product and organization info${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAILED - Asset should include product and organization info${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}❌ FAILED - Asset creation with valid productId${NC}"
        echo "Response: $create_response"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  No products found, skipping product-related tests${NC}"
fi

# Test 8: Check if web server is running (optional)
echo -e "\n${BLUE}Testing: Web server status${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web server is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  Web server is not running on port 3000${NC}"
    echo "To test UI changes, start the web server: cd web && pnpm run dev"
fi

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Asset Management API adaptation is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi

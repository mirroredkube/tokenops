#!/bin/bash

# Test script to verify the UI fix for product loading in asset creation

set -e

echo "🧪 Testing UI Fix for Product Loading"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

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
if curl -s http://localhost:4000/v1/products > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not running on port 4000${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Starting API Tests...${NC}"

# Test 1: Check if products endpoint returns data
check_api_response \
    "Products endpoint returns data" \
    "http://localhost:4000/v1/products" \
    "products"

# Test 2: Check if products endpoint works without status filter
check_api_response \
    "Products endpoint works without status filter" \
    "http://localhost:4000/v1/products?limit=50" \
    "Test Product"

# Test 3: Check CORS headers
echo -e "\n${BLUE}Testing: CORS configuration${NC}"
cors_response=$(curl -s -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -X OPTIONS "http://localhost:4000/v1/products" -w "%{http_code}" 2>/dev/null || echo "ERROR")

if echo "$cors_response" | grep -q "204"; then
    echo -e "${GREEN}✅ PASSED - CORS preflight request successful${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED - CORS preflight request failed${NC}"
    ((TESTS_FAILED++))
fi

# Test 4: Check if web server is running
echo -e "\n${BLUE}Testing: Web server status${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web server is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  Web server is not running on port 3000${NC}"
    echo "To test UI changes, start the web server: cd web && pnpm run dev"
fi

# Test 5: Verify product data structure
echo -e "\n${BLUE}Testing: Product data structure${NC}"
product_response=$(curl -s "http://localhost:4000/v1/products" 2>/dev/null || echo "ERROR")

if echo "$product_response" | grep -q '"id"' && echo "$product_response" | grep -q '"name"' && echo "$product_response" | grep -q '"status"'; then
    echo -e "${GREEN}✅ PASSED - Product data has required fields${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED - Product data missing required fields${NC}"
    ((TESTS_FAILED++))
fi

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The UI fix should work correctly.${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Start the web server: cd web && pnpm run dev"
    echo "2. Navigate to http://localhost:3000/app/assets/create"
    echo "3. Verify that products load correctly in the dropdown"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi

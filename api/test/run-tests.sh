#!/bin/bash

# Test runner for Compliance API endpoints
echo "🧪 Running Compliance API Tests..."
echo "=================================="

# Check if tap is installed
if ! command -v tap &> /dev/null; then
    echo "❌ tap test runner not found. Installing..."
    npm install -g tap
fi

# Set test environment
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tokenops"

echo "📋 Running Evidence API Tests..."
tap test/evidence-api.test.js

echo "📋 Running Requirement Status Update Tests..."
tap test/requirement-status.test.js

echo "📋 Running Compliance Requirements Tests..."
tap test/compliance-requirements.test.js

echo "✅ All tests completed!"
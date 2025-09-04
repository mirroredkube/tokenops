#!/bin/bash

# Platform Acknowledgement Tests
echo "🧪 Running Platform Acknowledgement Tests..."

# Check if API server is running
if ! curl -s http://localhost:4000/health > /dev/null; then
    echo "❌ API server is not running on port 4000"
    echo "Please start the API server first: pnpm dev"
    exit 1
fi

# Run the platform acknowledgement tests
echo "Running platform acknowledgement workflow tests..."
npx tap test/platform-acknowledgement.test.js --reporter=spec

echo "✅ Platform acknowledgement tests completed!"

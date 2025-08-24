# API Tests

This folder contains test scripts for the TokenOps API.

## Test Scripts

### `test-registry.sh`
Comprehensive test suite for the token registry API endpoints.

**Features tested:**
- ✅ Database setup and migrations
- ✅ Token creation and idempotency
- ✅ Token listing and pagination
- ✅ Token retrieval by ID
- ✅ JSON export functionality
- ✅ CSV export functionality
- ✅ Filtering by symbol and ledger
- ✅ Error handling
- ✅ Input validation

## Prerequisites

1. **API Server Running**: Start the API server first:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Dependencies**: Ensure you have:
   - `jq` installed for JSON parsing
   - PostgreSQL running
   - Node.js and pnpm

## Running Tests

### From the API root directory:
```bash
./test/test-registry.sh
```

### From the test directory:
```bash
cd test
./test-registry.sh
```

## Test Results

The script will:
1. Check if the API server is running
2. Generate Prisma client and run migrations
3. Execute all test scenarios
4. Display detailed results with colored output
5. Show a summary of all tests passed

## Expected Output

```
🚀 Starting Token Registry API Tests...
======================================
[SUCCESS] 🎉 All tests completed successfully!

Test Summary:
- ✅ Database setup and migrations
- ✅ Token creation and idempotency
- ✅ Token listing and pagination
- ✅ Token retrieval by ID
- ✅ JSON export functionality
- ✅ CSV export functionality
- ✅ Filtering by symbol and ledger
- ✅ Error handling
- ✅ Input validation
```

## Adding New Tests

To add new test scripts:
1. Create your script in this folder
2. Make it executable: `chmod +x your-test.sh`
3. Update this README with documentation
4. Follow the same pattern as `test-registry.sh` for consistency

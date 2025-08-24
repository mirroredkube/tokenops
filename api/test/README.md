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
- ✅ Bulk export functionality (JSON/CSV)
- ✅ Filtering by symbol and ledger
- ✅ Error handling
- ✅ Input validation

### `test-auto-registry.sh`
Tests automatic registry creation when issuing tokens.

**Features tested:**
- ✅ Automatic registry entry creation during token issuance
- ✅ Registry entry verification after issuance
- ✅ Idempotency testing for automatic creation
- ✅ Manual vs automatic registry comparison
- ✅ Final registry state validation

## Prerequisites

1. **PostgreSQL Running**: Ensure PostgreSQL is running on localhost:5432
2. **Dependencies**: Ensure you have:
   - `jq` installed for JSON parsing
   - PostgreSQL running
   - Node.js and pnpm

## Test Database Setup

**⚠️ IMPORTANT: Tests use a separate test database to avoid affecting production data.**

### Quick Start (Recommended)
```bash
# Run all tests with automatic setup and cleanup
./test/run-tests.sh
```

### Manual Setup
```bash
# 1. Set up test database
./test/test-db-setup.sh

# 2. Start API server with test database
DATABASE_URL="postgresql://anitha:tokenops123@localhost:5432/tokenops_test_1234567890" npm run dev

# 3. Run individual tests
./test/test-registry.sh
./test/test-auto-registry.sh

# 4. Clean up when done
./test/cleanup-test-db.sh
```

## Running Tests

### Quick Test Run (Recommended)
```bash
# From API root directory
./test/run-tests.sh
```

### Individual Test Runs
```bash
# From API root directory
./test/test-registry.sh
./test/test-auto-registry.sh

# From test directory
cd test
./test-registry.sh
./test-auto-registry.sh
```

## Test Results

The test suite will:
1. Set up a temporary test database
2. Start the API server on port 4001 with test database
3. Run all test scenarios
4. Display detailed results with colored output
5. Clean up test database and stop server
6. Show a summary of all tests passed

## Test Database Details

- **Database Name**: `tokenops_test_<timestamp>`
- **Port**: 4001 (separate from production port 4000)
- **Isolation**: Completely separate from production database
- **Auto-cleanup**: Automatically removed after tests complete

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

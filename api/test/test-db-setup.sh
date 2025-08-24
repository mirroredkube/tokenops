#!/bin/bash

# Test Database Setup Script
# Creates a temporary test database for running tests

set -e  # Exit on any error

echo "🔧 Setting up Test Database..."
echo "=============================="

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

# Generate unique test database name
TEST_DB_NAME="tokenops_test_$(date +%s)"
TEST_DB_URL="postgresql://anitha:tokenops123@localhost:5432/${TEST_DB_NAME}"

print_status "Creating test database: $TEST_DB_NAME"

# Create test database
psql -h localhost -p 5432 -U anitha -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" || {
    print_error "Failed to create test database"
    exit 1
}

print_success "Test database created: $TEST_DB_NAME"

# Create test .env file
print_status "Creating test environment file..."
TEST_ENV_FILE=".env.test"

cat > "$TEST_ENV_FILE" << EOF
# Test Database Configuration
DATABASE_URL="$TEST_DB_URL"

# XRPL Test Configuration
ISSUER_SEED=sEdSQGbRhZZ1p2jSVigpRv9wXNEQy1c
XRPL_ENDPOINT=wss://s.altnet.rippletest.net:51233

# Test Server Configuration
PORT=4001
EOF

print_success "Test environment file created: $TEST_ENV_FILE"

# Run migrations on test database
print_status "Running migrations on test database..."
cd .. && DATABASE_URL="$TEST_DB_URL" npx prisma migrate deploy

print_success "Migrations completed on test database"

# Generate Prisma client for test database
print_status "Generating Prisma client..."
DATABASE_URL="$TEST_DB_URL" npx prisma generate

print_success "Prisma client generated"

# Create cleanup script
print_status "Creating cleanup script..."
CLEANUP_SCRIPT="test/cleanup-test-db.sh"

cat > "$CLEANUP_SCRIPT" << 'EOF'
#!/usr/bin/env bash
# test/cleanup-test-db.sh
set -euo pipefail

echo "[CLEANUP] Starting test DB cleanup..."

# Resolve paths and load test env if needed
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$ROOT_DIR/test"

# Load DATABASE_URL from test/.env.test if not already set
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$TEST_DIR/.env.test" ]]; then
    echo "[CLEANUP] Loading DATABASE_URL from test/.env.test"
    set -a
    # shellcheck source=/dev/null
    source "$TEST_DIR/.env.test"
    set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[CLEANUP] No DATABASE_URL found; nothing to drop. Done."
  exit 0
fi

# Strip query string and extract db name
DB_URL_NO_QUERY="${DATABASE_URL%%\?*}"
DB_NAME="${DB_URL_NO_QUERY##*/}"

if [[ -z "$DB_NAME" ]]; then
  echo "[CLEANUP] Could not determine DB name from DATABASE_URL."
  exit 0
fi

# Build admin URL pointing to the 'postgres' database on same host/user
ADMIN_URL="${DATABASE_URL%/*}/postgres"

echo "[CLEANUP] Target DB: $DB_NAME"
echo "[CLEANUP] Admin URL: ${ADMIN_URL%%:*}://***@$(echo "${ADMIN_URL#*@}" | sed 's/:.*@/@/; s/\?.*$//')/postgres"

# Ensure psql exists
if ! command -v psql >/dev/null 2>&1; then
  echo "[CLEANUP] psql not found on PATH. Skipping drop."
  exit 0
fi

# Terminate connections and drop DB
echo "[CLEANUP] Terminating active connections to $DB_NAME ..."
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

echo "[CLEANUP] Dropping database $DB_NAME ..."
# WITH (FORCE) works on PG 13+. We do a plain DROP after terminating connections for compatibility.
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "[CLEANUP] ✅ Dropped $DB_NAME successfully."
EOF

chmod +x "$CLEANUP_SCRIPT"

print_success "Cleanup script created: $CLEANUP_SCRIPT"

echo ""
echo "=============================="
print_success "🎉 Test Database Setup Complete!"
echo ""
echo "Test Database Details:"
echo "- Database Name: $TEST_DB_NAME"
echo "- Database URL: $TEST_DB_URL"
echo "- Environment File: $TEST_ENV_FILE"
echo "- Cleanup Script: $CLEANUP_SCRIPT"
echo ""
echo "To run tests with test database:"
echo "  DATABASE_URL=\"$TEST_DB_URL\" npm run dev"
echo ""
echo "To cleanup test database:"
echo "  ./test/cleanup-test-db.sh"
echo ""
echo "⚠️  IMPORTANT: Always use the cleanup script when done testing!"

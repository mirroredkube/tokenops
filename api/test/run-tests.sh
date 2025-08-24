#!/usr/bin/env bash
# test/run-tests.sh
set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$ROOT_DIR/test"
CLEANUP_SCRIPT="$TEST_DIR/cleanup-test-db.sh"
TEST_ENV_FILE="$TEST_DIR/.env.test"

mkdir -p "$TEST_DIR"

# ── Always clean up (on success or failure) ────────────────────────────────────
cleanup() {
  echo ""
  echo "────────────────────────────────────────"
  echo "🧹 Running final cleanup…"

  # 1) Drop the ephemeral DB if cleanup script exists
  if [[ -f "$CLEANUP_SCRIPT" ]]; then
    echo "[cleanup] Executing $CLEANUP_SCRIPT"
    # Don't fail the whole cleanup if DB drop fails
    bash "$CLEANUP_SCRIPT" || echo "[cleanup] (warning) DB drop step failed"
  else
    echo "[cleanup] No cleanup script found at $CLEANUP_SCRIPT"
  fi

  # 2) Remove the ephemeral .env.test
  if [[ -f "$TEST_ENV_FILE" ]]; then
    rm -f "$TEST_ENV_FILE"
    echo "[cleanup] Removed $TEST_ENV_FILE"
  fi

  # 3) Remove the generated cleanup script itself
  if [[ -f "$CLEANUP_SCRIPT" ]]; then
    rm -f "$CLEANUP_SCRIPT"
    echo "[cleanup] Removed $CLEANUP_SCRIPT"
  fi

  echo "✅ Cleanup complete."
}
trap cleanup EXIT

echo "🧪 TokenOps API Test Suite"
echo "=========================="

# ── 1) DB setup ────────────────────────────────────────────────────────────────
echo "🔧 Setting up test database…"
"$TEST_DIR/test-db-setup.sh"

# The setup script should have created/updated:
#   - $TEST_DIR/.env.test with DATABASE_URL for the ephemeral DB
#   - $TEST_DIR/cleanup-test-db.sh to drop that DB
# We just rely on those here, and remove them in the trap afterward.

# ── 2) Registry API tests ─────────────────────────────────────────────────────
echo ""
echo "🚀 Running registry tests…"
"$TEST_DIR/test-registry.sh"

# ── 3) Auto-registry tests (your script may simulate XRPL) ────────────────────
echo ""
echo "🚀 Running auto-registry tests…"
"$TEST_DIR/test-auto-registry.sh"

echo ""
echo "=========================="
echo "🎉 All tests completed successfully!"
echo ""
echo "Test Summary:"
echo "- ✅ Test database setup"
echo "- ✅ Registry API tests"
echo "- ✅ Auto-registry tests"
echo "- ✅ Cleanup scheduled (trap)"
echo ""
echo "All tests passed! 🚀"
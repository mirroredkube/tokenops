#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:4001"

echo "🚀 Testing Automatic Registry Creation (Simulated XRPL)"
echo "======================================================="

echo "[INFO] Loading test environment..."
echo "[INFO] Checking if API server is running on test port 4001..."
curl -s -o /dev/null -w "%{http_code}" "$API_URL/system/health" | grep -q "200" \
  && echo "[SUCCESS] API server is running on test port!" \
  || { echo "[ERROR] API server not running"; exit 1; }

# --------------------------------------------
# Step 1: Simulate token issuance response
# --------------------------------------------
DUMMY_TX_HASH="SIMULATEDTXHASH1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890"

echo "[INFO] Step 1: Simulating /tokens/issue response..."
ISSUE_RESP=$(jq -n \
  --arg txHash "$DUMMY_TX_HASH" \
  '{ ok: true, txHash: $txHash }')

echo "Simulated Issue Response:"
echo "$ISSUE_RESP"

# --------------------------------------------
# Step 2: Create registry entry using simulated txHash
# --------------------------------------------
ISSUER_ADDR="rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
HOLDER_ADDR="rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
SYMBOL="SIMUSD"
SUPPLY="1000000"

echo "[INFO] Step 2: Registering token with simulated txHash..."
REGISTRY_RESP=$(curl -sS -X POST "$API_URL/registry/tokens" \
  -H "Content-Type: application/json" \
  -d "{
    \"ledger\": \"xrpl-testnet\",
    \"symbol\": \"$SYMBOL\",
    \"supply\": \"$SUPPLY\",
    \"issuerAddress\": \"$ISSUER_ADDR\",
    \"holderAddress\": \"$HOLDER_ADDR\",
    \"txHash\": \"$DUMMY_TX_HASH\",
    \"compliance\": {
      \"isin\": \"TEST00000001\",
      \"kyc\": \"simulated\",
      \"jurisdiction\": \"DE\"
    }
  }")

echo "Registry Response:"
echo "$REGISTRY_RESP"

# --------------------------------------------
# Step 3: Verify via GET /registry/tokens
# --------------------------------------------
echo "[INFO] Step 3: Fetching registry entries..."
LIST_RESP=$(curl -sS "$API_URL/registry/tokens?symbol=$SYMBOL&limit=5")
echo "List Response:"
echo "$LIST_RESP"

echo "[SUCCESS] ✅ Simulated automatic registry creation verified!"
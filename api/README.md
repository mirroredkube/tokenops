# TokenOps API (XRPL + Fastify)

## Quick start
1) Copy `.env.example` to `.env` and set:
   - `ISSUER_SEED` (XRPL Testnet secret from the faucet)
   - `DATABASE_URL` (Postgres)
2) Install deps:
   ```bash
   pnpm i
   pnpm prisma:generate
   ```
3) Run in dev:
   ```bash
   pnpm dev
   ```

## Endpoints
- `GET /health`
- `GET /xrpl-status`
- `POST /tokens/issue`

### POST /tokens/issue
Body:
```json
{
  "currencyCode": "EURT",
  "amount": "100",
  "destination": "r...destinationAddress",
  "metadata": { "jurisdiction": "DE", "isin": "TESTISIN123" }
}
```

Notes:
- Issuing an **issued currency** requires the destination account to **create a trust line** first.
- If the trust line isn't set, XRPL will reject the Payment. The API returns a helpful error.
- You can test with XRP payment by setting `currencyCode: "XRP"`.

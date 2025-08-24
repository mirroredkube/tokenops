import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import prisma from '../db/client.js'

// ---------- validation ----------
const xrplClassicAddress = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/ // base58, 25-35 chars
const xrplTxHash = /^[A-F0-9]{64}$/i

const LedgerEnum = z.enum(['xrpl-testnet', 'xrpl-mainnet'])
type LedgerIn = z.infer<typeof LedgerEnum>

const toPrismaLedger = (l: LedgerIn) =>
  l === 'xrpl-testnet' ? 'XRPL_TESTNET' : 'XRPL_MAINNET'

const fromPrismaLedger = (l: 'XRPL_TESTNET' | 'XRPL_MAINNET') =>
  l === 'XRPL_TESTNET' ? 'xrpl-testnet' : 'xrpl-mainnet'

const CreateTokenSchema = z.object({
  ledger: LedgerEnum.default('xrpl-testnet'),
  symbol: z
    .string()
    .min(2)
    .max(12)
    .regex(/^[A-Z0-9]+$/)
    .transform((s) => s.toUpperCase()),
  supply: z.string().regex(/^\d+$/),
  issuerAddress: z.string().regex(xrplClassicAddress, 'invalid_xrpl_address'),
  holderAddress: z.string().regex(xrplClassicAddress, 'invalid_xrpl_address').optional(),
  txHash: z.string().regex(xrplTxHash, 'invalid_tx_hash'),
  compliance: z.record(z.any()).optional(),
})

const QuerySchema = z.object({
  symbol: z.string().optional(),
  ledger: LedgerEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // id cursor
})

const ParamsSchema = z.object({
  id: z.string().min(1),
})

export default async function registryRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // POST /registry/tokens (idempotent via txHash upsert)
  app.post('/tokens', {
    schema: {
      summary: 'Create or update a token record',
      description: 'Creates a new token record or updates an existing one based on transaction hash. Idempotent operation.',
      tags: ['registry'],
      body: {
        type: 'object',
        required: ['symbol', 'supply', 'issuerAddress', 'txHash'],
        properties: {
          ledger: {
            type: 'string',
            enum: ['xrpl-testnet', 'xrpl-mainnet'],
            default: 'xrpl-testnet',
            description: 'Target ledger for the token',
          },
          symbol: {
            type: 'string',
            minLength: 2,
            maxLength: 12,
            pattern: '^[A-Z0-9]+$',
            description: 'Token symbol (2-12 characters, uppercase alphanumeric)',
          },
          supply: {
            type: 'string',
            pattern: '^\\d+$',
            description: 'Total token supply as a string',
          },
          issuerAddress: {
            type: 'string',
            pattern: '^r[1-9A-HJ-NP-Za-km-z]{25,34}$',
            description: 'XRPL issuer address',
          },
          holderAddress: {
            type: 'string',
            pattern: '^r[1-9A-HJ-NP-Za-km-z]{25,34}$',
            description: 'Optional holder address',
          },
          txHash: {
            type: 'string',
            pattern: '^[A-F0-9]{64}$',
            description: 'Transaction hash (64 hex characters)',
          },
          compliance: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional compliance metadata',
          },
        },
        examples: [
          {
            ledger: 'xrpl-testnet',
            symbol: 'EURT',
            supply: '1000000',
            issuerAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            holderAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            txHash: 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
            compliance: { isin: 'EU0000000001', kyc: 'mandatory', jurisdiction: 'DE' },
          },
        ],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ledger: { type: 'string', enum: ['xrpl-testnet', 'xrpl-mainnet'] },
            symbol: { type: 'string' },
            supply: { type: 'string' },
            issuerAddress: { type: 'string' },
            holderAddress: { type: 'string', nullable: true },
            txHash: { type: 'string' },
            compliance: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        422: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object' },
          },
        },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = CreateTokenSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(422).send({ 
        error: 'validation_error', 
        details: parsed.error.flatten() 
      })
    }

    const data = {
      ...parsed.data,
      ledger: toPrismaLedger(parsed.data.ledger),
    } as const

    try {
      const rec = await prisma.tokenRecord.upsert({
        where: { txHash: data.txHash },
        create: data,
        update: {
          ledger: data.ledger,
          symbol: data.symbol,
          supply: data.supply,
          issuerAddress: data.issuerAddress,
          holderAddress: data.holderAddress ?? null,
          compliance: data.compliance ?? undefined,
        },
      })

      return reply.status(201).send({ ...rec, ledger: fromPrismaLedger(rec.ledger) })
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || 'Database error' })
    }
  })

  // GET /registry/tokens/:id
  app.get('/tokens/:id', {
    schema: {
      summary: 'Get a specific token record by ID',
      description: 'Retrieves a token record by its unique identifier',
      tags: ['registry'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Token record ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ledger: { type: 'string', enum: ['xrpl-testnet', 'xrpl-mainnet'] },
            symbol: { type: 'string' },
            supply: { type: 'string' },
            issuerAddress: { type: 'string' },
            holderAddress: { type: 'string', nullable: true },
            txHash: { type: 'string' },
            compliance: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = ParamsSchema.safeParse(req.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid ID format' })
    }

    try {
      const rec = await prisma.tokenRecord.findUnique({ where: { id: parsed.data.id } })
      if (!rec) return reply.status(404).send({ error: 'not_found' })
      
      return reply.send({ ...rec, ledger: fromPrismaLedger(rec.ledger) })
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || 'Database error' })
    }
  })

  // GET /registry/tokens (filter + pagination)
  app.get('/tokens', {
    schema: {
      summary: 'List token records with filtering and pagination',
      description: 'Retrieves a paginated list of token records with optional filtering by symbol and ledger',
      tags: ['registry'],
      querystring: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Filter by token symbol' },
          ledger: { 
            type: 'string', 
            enum: ['xrpl-testnet', 'xrpl-mainnet'],
            description: 'Filter by ledger' 
          },
          limit: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100, 
            default: 20,
            description: 'Number of records to return (1-100)' 
          },
          cursor: { type: 'string', description: 'Cursor for pagination (token ID)' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  ledger: { type: 'string', enum: ['xrpl-testnet', 'xrpl-mainnet'] },
                  symbol: { type: 'string' },
                  supply: { type: 'string' },
                  issuerAddress: { type: 'string' },
                  holderAddress: { type: 'string', nullable: true },
                  txHash: { type: 'string' },
                  compliance: { type: 'object', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            nextCursor: { type: 'string', nullable: true },
          },
        },
        422: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object' },
          },
        },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.status(422).send({ 
        error: 'validation_error', 
        details: parsed.error.flatten() 
      })
    }

    const where = {
      ...(parsed.data.symbol ? { symbol: parsed.data.symbol.toUpperCase() } : {}),
      ...(parsed.data.ledger ? { ledger: toPrismaLedger(parsed.data.ledger) as any } : {}),
    }

    try {
      const items = await prisma.tokenRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: parsed.data.limit + 1,
        ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
      })

      const hasNext = items.length > parsed.data.limit
      const pageItems = hasNext ? items.slice(0, -1) : items

      return reply.send({
        items: pageItems.map((r: any) => ({ ...r, ledger: fromPrismaLedger(r.ledger) })),
        nextCursor: hasNext ? pageItems[pageItems.length - 1].id : null,
      })
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || 'Database error' })
    }
  })

  // GET /registry/tokens/:id/report (CSV or JSON)
  app.get('/tokens/:id/report', {
    schema: {
      summary: 'Export token record as JSON or CSV',
      description: 'Exports a token record in JSON or CSV format based on Accept header or format query parameter',
      tags: ['registry'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Token record ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv'],
            description: 'Export format (defaults to JSON)' 
          },
        },
      },
      response: {
        200: {
          description: 'Token record in requested format',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  ledger: { type: 'string', enum: ['xrpl-testnet', 'xrpl-mainnet'] },
                  symbol: { type: 'string' },
                  supply: { type: 'string' },
                  issuerAddress: { type: 'string' },
                  holderAddress: { type: 'string', nullable: true },
                  txHash: { type: 'string' },
                  compliance: { type: 'object', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            'text/csv': {
              schema: { type: 'string' },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parsed = ParamsSchema.safeParse(req.params)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid ID format' })
    }

    try {
      const rec = await prisma.tokenRecord.findUnique({ where: { id: parsed.data.id } })
      if (!rec) return reply.status(404).send({ error: 'not_found' })

      const wire = { ...rec, ledger: fromPrismaLedger(rec.ledger) }
      const wantsCsv =
        (typeof (req.query as any).format === 'string' && (req.query as any).format.toLowerCase() === 'csv') ||
        req.headers.accept?.includes('text/csv')

      if (!wantsCsv) {
        reply.header('Content-Type', 'application/json; charset=utf-8')
        return reply.send(wire)
      }

      const columns = [
        'id',
        'ledger',
        'symbol',
        'supply',
        'issuerAddress',
        'holderAddress',
        'txHash',
        'createdAt',
        'compliance',
      ] as const

      const esc = (v: unknown) => {
        if (v == null) return ''
        const s = typeof v === 'string' ? v : JSON.stringify(v)
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      }

      const header = columns.join(',')
      const row = columns.map((k) => esc((wire as any)[k])).join(',')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="token-${wire.id}.csv"`)
      return reply.send(`${header}\n${row}\n`)
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || 'Database error' })
    }
  })
}
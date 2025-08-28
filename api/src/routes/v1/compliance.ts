import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'

// ---------- validation ----------
const ComplianceRecordSchema = z.object({
  version: z.string().default('cmp.v1'),
  assetId: z.string().min(1),
  holder: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/),
  isin: z.string().optional(),
  legalIssuer: z.string().optional(),
  jurisdiction: z.string().optional(),
  micaClass: z.string().optional(),
  kycRequirement: z.string().optional(),
  transferRestrictions: z.boolean().default(false),
  purpose: z.string().optional(),
  docs: z.array(z.object({
    type: z.string(),
    hash: z.string().regex(/^sha256:[a-fA-F0-9]{64}$/)
  })).optional(),
  consentTs: z.string().datetime().optional()
})

export default async function complianceRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // POST create compliance record
  app.post('/compliance-records', {
    schema: {
      summary: 'Create compliance record',
      description: 'Store off-ledger compliance metadata (MiCA, ISIN, jurisdiction)',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['assetId', 'holder'],
        properties: {
          version: { type: 'string', default: 'cmp.v1' },
          assetId: { type: 'string', description: 'Asset identifier' },
          holder: { type: 'string', pattern: '^r[a-zA-Z0-9]{24,34}$' },
          isin: { type: 'string', description: 'ISIN code' },
          legalIssuer: { type: 'string', description: 'Legal issuer name' },
          jurisdiction: { type: 'string', description: 'Jurisdiction code' },
          micaClass: { type: 'string', description: 'MiCA classification' },
          kycRequirement: { type: 'string', description: 'KYC requirement level' },
          transferRestrictions: { type: 'boolean', default: false },
          purpose: { type: 'string', description: 'Token purpose' },
          docs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                hash: { type: 'string', pattern: '^sha256:[a-fA-F0-9]{64}$' }
              }
            }
          },
          consentTs: { type: 'string', format: 'date-time' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            recordId: { type: 'string' },
            sha256: { type: 'string' },
            status: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = ComplianceRecordSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const record = parsed.data
    
    try {
      // Canonicalize JSON (sort keys, no extra whitespace)
      const canonicalJson = JSON.stringify(record, Object.keys(record).sort())
      
      // Compute SHA256 hash
      const sha256 = crypto.createHash('sha256').update(canonicalJson).digest('hex')
      
      // Generate record ID
      const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // For MVP, we'll just return the hash and ID
      // TODO: Store in database
      console.log('Compliance record created:', {
        recordId,
        sha256,
        record: canonicalJson
      })
      
      return reply.status(201).send({
        recordId,
        sha256: `sha256:${sha256}`,
        status: 'unverified'
      })
    } catch (error: any) {
      console.error('Error creating compliance record:', error)
      return reply.status(400).send({ error: 'Failed to create compliance record' })
    }
  })

  // GET compliance record
  app.get('/compliance-records/:recordId', {
    schema: {
      summary: 'Get compliance record',
      description: 'Fetch compliance record (redacted for privacy)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['recordId'],
        properties: {
          recordId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            recordId: { type: 'string' },
            sha256: { type: 'string' },
            status: { type: 'string' },
            // Redacted fields for privacy
            assetId: { type: 'string' },
            jurisdiction: { type: 'string' },
            micaClass: { type: 'string' },
            transferRestrictions: { type: 'boolean' },
            purpose: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { recordId } = req.params as { recordId: string }
    
    // For MVP, we'll return a mock response
    // TODO: Fetch from database
    if (!recordId.startsWith('rec_')) {
      return reply.status(404).send({ error: 'Compliance record not found' })
    }
    
    return reply.send({
      recordId,
      sha256: 'sha256:mock_hash_for_mvp',
      status: 'unverified',
      assetId: 'asset_123',
      jurisdiction: 'DE',
      micaClass: 'Utility Token',
      transferRestrictions: false,
      purpose: 'Payment, Utility'
    })
  })
}

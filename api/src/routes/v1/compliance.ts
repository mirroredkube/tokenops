import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { checkIdempotency, storeIdempotency } from './shared.js'
import prisma from '../../db/client.js'

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

const ComplianceVerifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  reason: z.string().optional()
})

export default async function complianceRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // GET list compliance records
  app.get('/compliance-records', {
    schema: {
      summary: 'List compliance records',
      description: 'Get paginated list of compliance records with filters',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['UNVERIFIED', 'VERIFIED', 'REJECTED'] },
          assetId: { type: 'string' },
          holder: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  recordId: { type: 'string' },
                  assetId: { type: 'string' },
                  assetRef: { type: 'string' },
                  holder: { type: 'string' },
                  status: { type: 'string' },
                  sha256: { type: 'string' },
                  createdAt: { type: 'string' },
                  verifiedAt: { type: 'string' },
                  verifiedBy: { type: 'string' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { page = 1, limit = 20, status, assetId, holder } = req.query as any
    
    try {
      const where: any = {}
      if (status) where.status = status
      if (assetId) where.assetId = assetId
      if (holder) where.holder = { contains: holder, mode: 'insensitive' }
      
      const [records, total] = await Promise.all([
        prisma.complianceRecord.findMany({
          where,
          include: {
            asset: {
              select: {
                assetRef: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.complianceRecord.count({ where })
      ])
      
      const formattedRecords = records.map((record: any) => ({
        id: record.id,
        recordId: record.recordId,
        assetId: record.assetId,
        assetRef: record.asset.assetRef,
        holder: record.holder,
        status: record.status,
        sha256: record.sha256,
        createdAt: record.createdAt.toISOString(),
        verifiedAt: record.verifiedAt?.toISOString(),
        verifiedBy: record.verifiedBy
      }))
      
      return reply.send({
        records: formattedRecords,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (error: any) {
      console.error('Error fetching compliance records:', error)
      return reply.status(500).send({ error: 'Failed to fetch compliance records' })
    }
  })

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
    
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'] as string
    const existingResponse = checkIdempotency(idempotencyKey)
    if (existingResponse) {
      return reply.status(201).send(existingResponse)
    }
    
    try {
      // Verify asset exists
      const asset = await prisma.asset.findUnique({
        where: { id: record.assetId }
      })
      
      if (!asset) {
        return reply.status(400).send({ error: 'Asset not found' })
      }
      
      // Canonicalize JSON (sort keys, no extra whitespace)
      const canonicalJson = JSON.stringify(record, Object.keys(record).sort())
      
      // Compute SHA256 hash
      const sha256 = crypto.createHash('sha256').update(canonicalJson).digest('hex')
      
      // Generate record ID
      const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create compliance record in database
      const complianceRecord = await prisma.complianceRecord.create({
        data: {
          recordId,
          assetId: record.assetId,
          holder: record.holder,
          sha256: `sha256:${sha256}`,
          isin: record.isin,
          legalIssuer: record.legalIssuer,
          jurisdiction: record.jurisdiction,
          micaClass: record.micaClass,
          kycRequirement: record.kycRequirement,
          transferRestrictions: record.transferRestrictions,
          purpose: record.purpose,
          docs: record.docs,
          consentTs: record.consentTs ? new Date(record.consentTs) : null
        }
      })
      
      const response = {
        recordId: complianceRecord.recordId,
        sha256: complianceRecord.sha256,
        status: complianceRecord.status.toLowerCase()
      }
      
      // Store for idempotency
      if (idempotencyKey) {
        storeIdempotency(idempotencyKey, response)
      }
      
      return reply.status(201).send(response)
    } catch (error: any) {
      console.error('Error creating compliance record:', error)
      return reply.status(400).send({ error: 'Failed to create compliance record' })
    }
  })

  // GET compliance record
  app.get('/compliance-records/:recordId', {
    schema: {
      summary: 'Get compliance record',
      description: 'Fetch compliance record details',
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
            id: { type: 'string' },
            recordId: { type: 'string' },
            assetId: { type: 'string' },
            assetRef: { type: 'string' },
            holder: { type: 'string' },
            sha256: { type: 'string' },
            status: { type: 'string' },
            verifiedAt: { type: 'string' },
            verifiedBy: { type: 'string' },
            reason: { type: 'string' },
            // Compliance metadata
            isin: { type: 'string' },
            legalIssuer: { type: 'string' },
            jurisdiction: { type: 'string' },
            micaClass: { type: 'string' },
            kycRequirement: { type: 'string' },
            transferRestrictions: { type: 'boolean' },
            purpose: { type: 'string' },
            docs: { type: 'array' },
            consentTs: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { recordId } = req.params as { recordId: string }
    
    try {
      const record = await prisma.complianceRecord.findUnique({
        where: { recordId },
        include: {
          asset: {
            select: {
              assetRef: true
            }
          }
        }
      })
      
      if (!record) {
        return reply.status(404).send({ error: 'Compliance record not found' })
      }
      
      return reply.send({
        id: record.id,
        recordId: record.recordId,
        assetId: record.assetId,
        assetRef: record.asset.assetRef,
        holder: record.holder,
        sha256: record.sha256,
        status: record.status,
        verifiedAt: record.verifiedAt?.toISOString(),
        verifiedBy: record.verifiedBy,
        reason: record.reason,
        isin: record.isin,
        legalIssuer: record.legalIssuer,
        jurisdiction: record.jurisdiction,
        micaClass: record.micaClass,
        kycRequirement: record.kycRequirement,
        transferRestrictions: record.transferRestrictions,
        purpose: record.purpose,
        docs: record.docs,
        consentTs: record.consentTs?.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error fetching compliance record:', error)
      return reply.status(500).send({ error: 'Failed to fetch compliance record' })
    }
  })

  // PATCH verify compliance record
  app.patch('/compliance-records/:recordId/verify', {
    schema: {
      summary: 'Verify compliance record',
      description: 'Update compliance record status (auditor/regulator only)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['recordId'],
        properties: {
          recordId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['VERIFIED', 'REJECTED'] },
          reason: { type: 'string', description: 'Reason for rejection' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            recordId: { type: 'string' },
            status: { type: 'string' },
            verifiedAt: { type: 'string' },
            reason: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { recordId } = req.params as { recordId: string }
    const parsed = ComplianceVerifySchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }
    
    const { status, reason } = parsed.data
    
    try {
      // Check if record exists
      const existingRecord = await prisma.complianceRecord.findUnique({
        where: { recordId }
      })
      
      if (!existingRecord) {
        return reply.status(404).send({ error: 'Compliance record not found' })
      }
      
      // TODO: Add RBAC check for issuer admin / regulator roles
      // if (!hasRole(req.user, ['admin', 'regulator'])) {
      //   return reply.status(403).send({ error: 'Insufficient permissions' })
      // }
      
      // Update the record
      const updatedRecord = await prisma.complianceRecord.update({
        where: { recordId },
        data: {
          status,
          verifiedAt: new Date(),
          verifiedBy: 'system', // TODO: Get from auth context
          reason: status === 'REJECTED' ? reason : null
        }
      })
      
      return reply.send({
        recordId: updatedRecord.recordId,
        status: updatedRecord.status,
        verifiedAt: updatedRecord.verifiedAt?.toISOString(),
        reason: updatedRecord.reason
      })
    } catch (error: any) {
      console.error('Error updating compliance record:', error)
      return reply.status(500).send({ error: 'Failed to update compliance record' })
    }
  })
}

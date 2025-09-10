import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { policyKernel, PolicyFacts } from '../../lib/policyKernel.js'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { tenantMiddleware, TenantRequest, requireActiveTenant } from '../../middleware/tenantMiddleware.js'

const prisma = new PrismaClient()

// ---------- Authentication Helper ----------
async function verifyAuthIfRequired(req: any, reply: any): Promise<any> {
  const AUTH_MODE = (process.env.AUTH_MODE ?? "off").toLowerCase()
  
  if (AUTH_MODE === "off") {
    return null // No authentication required
  }
  
  // Use the app's built-in verifyAuthOrApiKey decorator
  await (req.server as any).verifyAuthOrApiKey(req, reply)
  return req.user
}

// ===== VALIDATION SCHEMAS =====

const PolicyFactsSchema = z.object({
  // From Organization
  issuerCountry: z.string().length(2),
  
  // From Product
  assetClass: z.enum(['ART', 'EMT', 'OTHER']),
  targetMarkets: z.array(z.string().length(2)),
  
  // From Asset
  ledger: z.enum(['XRPL', 'ETHEREUM', 'HEDERA']),
  distributionType: z.enum(['offer', 'admission', 'private']),
  investorAudience: z.enum(['retail', 'professional', 'institutional']),
  isCaspInvolved: z.boolean(),
  transferType: z.enum(['CASP_TO_CASP', 'CASP_TO_SELF_HOSTED', 'SELF_HOSTED_TO_CASP', 'SELF_HOSTED_TO_SELF_HOSTED'])
})

const AssetComplianceSchema = z.object({
  assetId: z.string().min(1),
  productId: z.string().min(1)
})

export default async function complianceRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  
  // 1. POST /v1/compliance/evaluate - Evaluate policy facts
  app.post('/compliance/evaluate', {
    schema: {
      summary: 'Evaluate compliance policy facts',
      description: 'Evaluate policy facts and generate requirement instances and enforcement plan',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['issuerCountry', 'assetClass', 'targetMarkets', 'ledger', 'distributionType', 'investorAudience', 'isCaspInvolved', 'transferType'],
        properties: {
          issuerCountry: { type: 'string', minLength: 2, maxLength: 2 },
          assetClass: { type: 'string', enum: ['ART', 'EMT', 'OTHER'] },
          targetMarkets: { type: 'array', items: { type: 'string', minLength: 2, maxLength: 2 } },
          ledger: { type: 'string', enum: ['XRPL', 'ETHEREUM', 'HEDERA'] },
          distributionType: { type: 'string', enum: ['offer', 'admission', 'private'] },
          investorAudience: { type: 'string', enum: ['retail', 'professional', 'institutional'] },
          isCaspInvolved: { type: 'boolean' },
          transferType: { type: 'string', enum: ['CASP_TO_CASP', 'CASP_TO_SELF_HOSTED', 'SELF_HOSTED_TO_CASP', 'SELF_HOSTED_TO_SELF_HOSTED'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            requirementInstances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  requirementTemplateId: { type: 'string' },
                  status: { type: 'string', enum: ['NA', 'REQUIRED', 'SATISFIED', 'EXCEPTION'] },
                  rationale: { type: 'string' }
                }
              }
            },
            enforcementPlan: {
              type: 'object',
              properties: {
                xrpl: {
                  type: 'object',
                  properties: {
                    requireAuth: { type: 'boolean' },
                    trustlineAuthorization: { type: 'boolean' },
                    freezeControl: { type: 'boolean' }
                  }
                },
                evm: {
                  type: 'object',
                  properties: {
                    allowlistGating: { type: 'boolean' },
                    pauseControl: { type: 'boolean' },
                    mintControl: { type: 'boolean' },
                    transferControl: { type: 'boolean' }
                  }
                }
              }
            },
            rationale: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const facts = PolicyFactsSchema.parse(req.body) as PolicyFacts
      
      console.log('🔍 Evaluating compliance facts:', facts)
      
      const result = await policyKernel.evaluateFacts(facts)
      
      return reply.send(result)
    } catch (error: any) {
      console.error('❌ Error evaluating compliance:', error)
      return reply.status(400).send({ 
        error: 'Failed to evaluate compliance',
        details: error.message 
      })
    }
  })

  // 2. GET /v1/compliance/requirements - List requirement instances for an asset OR requirement templates
  app.get('/compliance/requirements', {
    schema: {
      summary: 'List requirement instances for an asset or requirement templates',
      description: 'Get requirement instances for a specific asset, or all requirement templates if no assetId provided',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          assetId: { type: 'string', description: 'Asset ID to get requirement instances for' },
          regime: { type: 'string', description: 'Filter by regulatory regime (when getting templates)' },
          active: { type: 'boolean', description: 'Filter by active status (when getting templates)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            requirements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  rationale: { type: 'string' },
                  evidenceRefs: { type: 'object' },
                  exceptionReason: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  requirementTemplate: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      regime: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          jurisdiction: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  applicabilityExpr: { type: 'string' },
                  effectiveFrom: { type: 'string' },
                  effectiveTo: { type: 'string' },
                  regime: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      jurisdiction: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId, regime, active } = req.query as any
      
      // If assetId is provided, return requirement instances for that asset
      if (assetId) {
        const requirements = await prisma.requirementInstance.findMany({
          where: { 
            assetId,
            issuanceId: null // Only live requirements, not snapshots
          },
          include: {
            requirementTemplate: {
              include: {
                regime: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
        
        return reply.send({ requirements })
      }
      
      // Otherwise, return requirement templates (existing logic)
      const where: any = {}
      
      if (regime) {
        where.regime = { id: regime }
      }
      
      if (active !== undefined) {
        const now = new Date()
        if (active) {
          where.effectiveFrom = { lte: now }
          where.OR = [
            { effectiveTo: null },
            { effectiveTo: { gt: now } }
          ]
        } else {
          where.OR = [
            { effectiveFrom: { gt: now } },
            { effectiveTo: { lte: now } }
          ]
        }
      }
      
      const templates = await prisma.requirementTemplate.findMany({
        where,
        include: {
          regime: true
        },
        orderBy: {
          name: 'asc'
        }
      })
      
      return reply.send({ templates })
    } catch (error: any) {
      console.error('❌ Error fetching requirements:', error)
      return reply.status(500).send({ error: 'Failed to fetch requirements' })
    }
  })

  // 3. POST /v1/compliance/instances - Create requirement instances for an asset
  app.post('/compliance/instances', {
    schema: {
      summary: 'Create requirement instances for an asset',
      description: 'Create requirement instances based on asset and product information',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['assetId', 'productId'],
        properties: {
          assetId: { type: 'string' },
          productId: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            instances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  requirementTemplateId: { type: 'string' },
                  status: { type: 'string' },
                  rationale: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId, productId } = AssetComplianceSchema.parse(req.body)
      
      // Get asset and product information
      const [asset, product] = await Promise.all([
        prisma.asset.findUnique({
          where: { id: assetId },
          include: {
            product: {
              include: {
                organization: true
              }
            }
          }
        }),
        prisma.product.findUnique({
          where: { id: productId },
          include: {
            organization: true
          }
        })
      ])
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }
      
      // Build policy facts from asset and product data
      const facts: PolicyFacts = {
        issuerCountry: product.organization.country,
        assetClass: product.assetClass,
        targetMarkets: product.targetMarkets || [],
        ledger: asset.ledger,
        distributionType: 'private', // Default - could be enhanced
        investorAudience: 'professional', // Default - could be enhanced
        isCaspInvolved: true, // Default - could be enhanced
        transferType: 'CASP_TO_CASP' // Default - could be enhanced
      }
      
      // Create requirement instances
      await policyKernel.createRequirementInstances(assetId, facts)
      
      // Get created instances
      const instances = await prisma.requirementInstance.findMany({
        where: { assetId },
        include: {
          requirementTemplate: true
        }
      })
      
      return reply.status(201).send({
        message: 'Requirement instances created successfully',
        instances: instances.map((instance: any) => ({
          id: instance.id,
          requirementTemplateId: instance.requirementTemplateId,
          status: instance.status,
          rationale: instance.rationale,
          template: instance.requirementTemplate
        }))
      })
    } catch (error: any) {
      console.error('❌ Error creating requirement instances:', error)
      return reply.status(500).send({ error: 'Failed to create requirement instances' })
    }
  })

  // 4. GET /v1/compliance/instances/:id - Get requirement instance details
  app.get('/compliance/instances/:id', {
    schema: {
      summary: 'Get requirement instance details',
      description: 'Get detailed information about a specific requirement instance',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            rationale: { type: 'string' },
            evidenceRefs: { type: 'object' },
            verifierId: { type: 'string' },
            verifiedAt: { type: 'string' },
            exceptionReason: { type: 'string' },
            requirementTemplate: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                regime: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { id } = req.params as { id: string }
      
      const instance = await prisma.requirementInstance.findUnique({
        where: { id },
        include: {
          requirementTemplate: {
            include: {
              regime: true
            }
          },
          verifier: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
      
      if (!instance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }
      
      return reply.send({
        id: instance.id,
        status: instance.status,
        rationale: instance.rationale,
        evidenceRefs: instance.evidenceRefs,
        verifierId: instance.verifierId,
        verifiedAt: instance.verifiedAt?.toISOString(),
        exceptionReason: instance.exceptionReason,
        requirementTemplate: instance.requirementTemplate,
        verifier: instance.verifier
      })
    } catch (error: any) {
      console.error('❌ Error fetching requirement instance:', error)
      return reply.status(500).send({ error: 'Failed to fetch requirement instance' })
    }
  })

  // 5. GET /v1/compliance/assets - Get assets for compliance filter dropdown
  app.get('/compliance/assets', {
    schema: {
      summary: 'Get assets for compliance filter dropdown',
      description: 'Get a simplified list of assets for use in compliance filtering',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            assets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  assetRef: { type: 'string' },
                  ledger: { type: 'string' },
                  status: { type: 'string' },
                  product: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      assetClass: { type: 'string' }
                    }
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { limit = 50, offset = 0 } = req.query as any
      
      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          select: {
            id: true,
            code: true,
            assetRef: true,
            ledger: true,
            status: true,
            product: {
              select: {
                id: true,
                name: true,
                assetClass: true,
                organization: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          take: limit,
          skip: offset,
          orderBy: {
            code: 'asc'
          }
        }),
        prisma.asset.count()
      ])
      
      const mappedAssets = assets.map((asset: any) => ({
        id: asset.id,
        code: asset.code,
        assetRef: asset.assetRef,
        ledger: asset.ledger,
        status: asset.status,
        product: asset.product,
        organization: asset.product.organization,
        displayName: `${asset.code} (${asset.product.name})`
      }))
      
      console.log('🔍 Assets with displayName:', mappedAssets)
      
      return reply.send({
        assets: mappedAssets,
        total
      })
    } catch (error: any) {
      console.error('❌ Error fetching assets for compliance filter:', error)
      return reply.status(500).send({ error: 'Failed to fetch assets' })
    }
  })

  // 6. GET /v1/compliance/instances - List requirement instances
  app.get('/compliance/instances', {
    schema: {
      summary: 'List requirement instances',
      description: 'Get all requirement instances with optional filtering',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          assetId: { type: 'string' },
          status: { type: 'string', enum: ['NA', 'REQUIRED', 'SATISFIED', 'EXCEPTION'] },
          regime: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            instances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  assetId: { type: 'string' },
                  issuanceId: { type: 'string' },
                  status: { type: 'string' },
                  rationale: { type: 'string' },
                  requirementTemplate: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      regime: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  },
                  asset: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      assetRef: { type: 'string' },
                      code: { type: 'string' },
                      assetClass: { type: 'string' }
                    }
                  }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId, status, regime, limit = 20, offset = 0 } = req.query as any
      
      const where: any = {}
      
      if (assetId) {
        where.assetId = assetId
      }
      
      if (status) {
        where.status = status
      }
      
      if (regime) {
        where.requirementTemplate = {
          regime: { id: regime }
        }
      }
      
      // Get requirement instances with basic info
      const [instances, total] = await Promise.all([
        prisma.requirementInstance.findMany({
          where,
          include: {
            requirementTemplate: {
              include: {
                regime: true
              }
            },
            asset: {
              include: {
                product: true
              }
            }
          },
          take: limit,
          skip: offset,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.requirementInstance.count({ where })
      ])

      // Transform instances with asset information (already included in query)
      console.log('Processing', instances.length, 'instances')
      const instancesWithAssets = instances.map((instance: any) => ({
        id: instance.id,
        assetId: instance.assetId,
        issuanceId: instance.issuanceId, // Include issuanceId for grouping
        status: instance.status,
        rationale: instance.rationale,
        platformAcknowledged: instance.platformAcknowledged || false,
        platformAcknowledgedBy: instance.platformAcknowledgedBy,
        platformAcknowledgedAt: instance.platformAcknowledgedAt,
        platformAcknowledgmentReason: instance.platformAcknowledgmentReason,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        requirementTemplate: {
          id: instance.requirementTemplate.id,
          name: instance.requirementTemplate.name,
          regime: instance.requirementTemplate.regime
        },
        asset: instance.asset ? {
          id: instance.asset.id,
          assetRef: instance.asset.assetRef,
          code: instance.asset.code,
          assetClass: instance.asset.assetClass,
          product: instance.asset.product ? {
            id: instance.asset.product.id,
            name: instance.asset.product.name,
            assetClass: instance.asset.product.assetClass
          } : null
        } : null
      }))

      return reply.send({
        instances: instancesWithAssets,
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('❌ Error fetching requirement instances:', error)
      return reply.status(500).send({ error: 'Failed to fetch requirement instances' })
    }
  })

  // 5. POST /v1/compliance/records - Create compliance record with hash for anchoring
  app.post('/compliance/records', {
    schema: {
      summary: 'Create compliance record with hash for anchoring',
      description: 'Create a compliance record with SHA256 hash for blockchain anchoring',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['assetId', 'holder'],
        properties: {
          assetId: { type: 'string' },
          holder: { type: 'string' },
          purpose: { type: 'string' },
          isin: { type: 'string' },
          legalIssuer: { type: 'string' },
          jurisdiction: { type: 'string' },
          micaClass: { type: 'string' },
          kycRequirement: { type: 'string' },
          transferRestrictions: { type: 'boolean' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            recordId: { type: 'string' },
            sha256: { type: 'string' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId, holder, purpose, isin, legalIssuer, jurisdiction, micaClass, kycRequirement, transferRestrictions } = req.body as any
      
      // Create compliance data object
      const complianceData = {
        assetId,
        holder,
        purpose,
        isin,
        legalIssuer,
        jurisdiction,
        micaClass,
        kycRequirement,
        transferRestrictions,
        timestamp: new Date().toISOString()
      }
      
      // Generate SHA256 hash of compliance data
      const crypto = await import('crypto')
      const complianceDataString = JSON.stringify(complianceData, Object.keys(complianceData).sort())
      const sha256 = crypto.createHash('sha256').update(complianceDataString).digest('hex')
      
      // Generate unique record ID
      const recordId = `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      console.log('🔐 Created compliance record:', { recordId, sha256 })
      
      return reply.status(201).send({
        recordId,
        sha256,
        createdAt: new Date().toISOString()
      })
    } catch (error: any) {
      console.error('❌ Error creating compliance record:', error)
      return reply.status(500).send({ error: 'Failed to create compliance record' })
    }
  })

  // PATCH /v1/compliance/requirements/:requirementId - Update requirement status
  app.patch('/compliance/requirements/:requirementId', {
    schema: {
      summary: 'Update requirement status',
      description: 'Update the status of a compliance requirement (SATISFIED, EXCEPTION)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['requirementId'],
        properties: {
          requirementId: { type: 'string', description: 'Requirement instance ID' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['REQUIRED', 'SATISFIED', 'EXCEPTION'],
            description: 'New status for the requirement'
          },
          exceptionReason: { type: 'string', description: 'Reason for exception (if status is EXCEPTION)' },
          rationale: { type: 'string', description: 'Rationale for the status change' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            exceptionReason: { type: 'string' },
            rationale: { type: 'string' },
            verifierId: { type: 'string' },
            verifiedAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { requirementId } = req.params as { requirementId: string }
      const { status, exceptionReason, rationale } = req.body as any

      // Get user from auth context
      const user = await verifyAuthIfRequired(req, reply)
      if (!user && process.env.AUTH_MODE && process.env.AUTH_MODE !== "off") {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      // Validate status
      if (!['REQUIRED', 'SATISFIED', 'EXCEPTION'].includes(status)) {
        return reply.status(400).send({ error: 'Invalid status value' })
      }

      // Validate exception reason if status is EXCEPTION
      if (status === 'EXCEPTION' && !exceptionReason) {
        return reply.status(400).send({ error: 'Exception reason is required when status is EXCEPTION' })
      }

      // Update requirement
      const updatedRequirement = await prisma.requirementInstance.update({
        where: { id: requirementId },
        data: {
          status,
          exceptionReason: status === 'EXCEPTION' ? exceptionReason : null,
          rationale,
          verifierId: user?.sub || null,
          verifiedAt: new Date()
        }
      })

      return reply.send({
        id: updatedRequirement.id,
        status: updatedRequirement.status,
        exceptionReason: updatedRequirement.exceptionReason,
        rationale: updatedRequirement.rationale,
        verifierId: updatedRequirement.verifierId,
        verifiedAt: updatedRequirement.verifiedAt?.toISOString()
      })
    } catch (error: any) {
      console.error('Error updating requirement status:', error)
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Requirement not found' })
      }
      return reply.status(500).send({ error: 'Failed to update requirement status' })
    }
  })

  // POST /v1/compliance/evidence - Upload evidence for a requirement
  app.post('/compliance/evidence', {
    schema: {
      summary: 'Upload evidence for a compliance requirement',
      description: 'Upload a file as evidence for a specific requirement instance',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['requirementInstanceId', 'fileName', 'fileType', 'fileSize', 'fileHash', 'uploadPath'],
        properties: {
          requirementInstanceId: { type: 'string', description: 'ID of the requirement instance' },
          fileName: { type: 'string', description: 'Original filename' },
          fileType: { type: 'string', description: 'MIME type of the file' },
          fileSize: { type: 'number', description: 'File size in bytes' },
          fileHash: { type: 'string', description: 'SHA256 hash of the file' },
          uploadPath: { type: 'string', description: 'Path where file is stored' },
          description: { type: 'string', description: 'Optional description of the evidence' },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Optional tags for categorization'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            requirementInstanceId: { type: 'string' },
            fileName: { type: 'string' },
            fileType: { type: 'string' },
            fileSize: { type: 'number' },
            fileHash: { type: 'string' },
            uploadPath: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            uploadedBy: { type: 'string' },
            uploadedAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { 
        requirementInstanceId, 
        fileName, 
        fileType, 
        fileSize, 
        fileHash, 
        uploadPath, 
        description, 
        tags = [] 
      } = req.body as any

      // Get user from auth context
      const user = await verifyAuthIfRequired(req, reply)
      if (!user) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      // Verify requirement instance exists
      const requirementInstance = await prisma.requirementInstance.findUnique({
        where: { id: requirementInstanceId }
      })

      if (!requirementInstance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }

      // Create evidence record
      const evidence = await prisma.evidence.create({
        data: {
          requirementInstanceId,
          fileName,
          fileType,
          fileSize,
          fileHash,
          uploadPath,
          description,
          tags,
          uploadedBy: user.sub
        }
      })

      return reply.status(201).send({
        id: evidence.id,
        requirementInstanceId: evidence.requirementInstanceId,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        fileHash: evidence.fileHash,
        uploadPath: evidence.uploadPath,
        description: evidence.description,
        tags: evidence.tags,
        uploadedBy: evidence.uploadedBy,
        uploadedAt: evidence.uploadedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error uploading evidence:', error)
      return reply.status(500).send({ error: 'Failed to upload evidence' })
    }
  })

  // POST /v1/compliance/evidence/upload - Upload evidence file with multipart form
  app.post('/compliance/evidence/upload', {
    schema: {
      summary: 'Upload evidence file for a compliance requirement',
      description: 'Upload a file as evidence using multipart form data',
      tags: ['v1'],
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            requirementInstanceId: { type: 'string' },
            fileName: { type: 'string' },
            fileType: { type: 'string' },
            fileSize: { type: 'number' },
            fileHash: { type: 'string' },
            uploadPath: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            uploadedBy: { type: 'string' },
            uploadedAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      // Get user from auth context
      const user = await verifyAuthIfRequired(req, reply)
      if (!user) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      // Parse multipart form data using the correct API
      const data = await (req as any).file()
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }


      // Extract form fields
      const requirementInstanceId = data.fields.requirementInstanceId?.value
      const description = data.fields.description?.value
      const tags = data.fields.tags?.value
      const file = data.file

      if (!requirementInstanceId || !file) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Verify requirement instance exists
      const requirementInstance = await prisma.requirementInstance.findUnique({
        where: { id: requirementInstanceId as string }
      })

      if (!requirementInstance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }

      // Generate file hash and save to disk
      const chunks: Buffer[] = []
      for await (const chunk of file) {
        chunks.push(chunk)
      }
      const fileBuffer = Buffer.concat(chunks)
      const crypto = require('crypto')
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
      
      // Create uploads directory if it doesn't exist
      const fs = require('fs')
      const path = require('path')
      const uploadsDir = path.join(__dirname, '../../../uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Save file with unique name
      const fileName = file.filename || 'evidence'
      const fileExt = path.extname(fileName)
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`
      const uploadPath = uniqueFileName
      
      fs.writeFileSync(path.join(uploadsDir, uniqueFileName), fileBuffer)

      // Parse tags
      const tagArray = tags ? (tags as string).split(',').map(t => t.trim()) : []

      // Create evidence record
      const evidence = await prisma.evidence.create({
        data: {
          requirementInstanceId: requirementInstanceId as string,
          fileName: fileName,
          fileType: file.mimetype || 'application/octet-stream',
          fileSize: fileBuffer.length,
          fileHash,
          uploadPath,
          description: description as string || null,
          tags: tagArray,
          uploadedBy: user.sub
        }
      })

      return reply.status(201).send({
        id: evidence.id,
        requirementInstanceId: evidence.requirementInstanceId,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        fileHash: evidence.fileHash,
        uploadPath: evidence.uploadPath,
        description: evidence.description,
        tags: evidence.tags,
        uploadedBy: evidence.uploadedBy,
        uploadedAt: evidence.uploadedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error uploading evidence file:', error)
      return reply.status(500).send({ error: 'Failed to upload evidence file' })
    }
  })

  // GET /v1/compliance/evidence/:requirementInstanceId - Get evidence for a requirement
  app.get('/compliance/evidence/:requirementInstanceId', {
    schema: {
      summary: 'Get evidence for a compliance requirement',
      description: 'Retrieve all evidence files for a specific requirement instance',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['requirementInstanceId'],
        properties: {
          requirementInstanceId: { type: 'string', description: 'ID of the requirement instance' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  fileName: { type: 'string' },
                  fileType: { type: 'string' },
                  fileSize: { type: 'number' },
                  fileHash: { type: 'string' },
                  description: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  uploadedBy: { type: 'string' },
                  uploadedAt: { type: 'string' }
                }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { requirementInstanceId } = req.params as { requirementInstanceId: string }

      // Verify requirement instance exists
      const requirementInstance = await prisma.requirementInstance.findUnique({
        where: { id: requirementInstanceId }
      })

      if (!requirementInstance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }

      // Get evidence for this requirement
      const evidence = await prisma.evidence.findMany({
        where: { requirementInstanceId },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          fileHash: true,
          description: true,
          tags: true,
          uploadedBy: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: 'desc' }
      })

      return reply.send({ evidence })
    } catch (error: any) {
      console.error('Error fetching evidence:', error)
      return reply.status(500).send({ error: 'Failed to fetch evidence' })
    }
  })

  // POST /v1/compliance/requirements/:requirementId/platform-acknowledge - Platform co-acknowledge ART/EMT requirement
  app.post('/compliance/requirements/:requirementId/platform-acknowledge', {
    schema: {
      summary: 'Platform co-acknowledge ART/EMT compliance requirement',
      description: 'Platform admin acknowledges compliance requirement for ART/EMT tokens',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['requirementId'],
        properties: {
          requirementId: { type: 'string', description: 'Requirement instance ID' }
        }
      },
      body: {
        type: 'object',
        required: ['acknowledgmentReason'],
        properties: {
          acknowledgmentReason: { 
            type: 'string', 
            description: 'Reason for platform acknowledgement',
            minLength: 10,
            maxLength: 500
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            platformAcknowledged: { type: 'boolean' },
            platformAcknowledgedBy: { type: 'string' },
            platformAcknowledgedAt: { type: 'string' },
            platformAcknowledgmentReason: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { requirementId } = req.params as { requirementId: string }
      const { acknowledgmentReason } = req.body as any

      // Get user from auth context
      const user = await verifyAuthIfRequired(req, reply)
      if (!user) {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      // Get user role for authorization check
      const dbUser = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { role: true }
      })

      if (!dbUser || !['ADMIN', 'COMPLIANCE_OFFICER'].includes(dbUser.role)) {
        return reply.status(403).send({ error: 'Platform admin role required for co-acknowledgement' })
      }

      // Get requirement instance with asset and product info
      const requirementInstance = await prisma.requirementInstance.findUnique({
        where: { id: requirementId },
        include: {
          asset: {
            include: {
              product: true
            }
          }
        }
      })

      if (!requirementInstance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }

      // Check if this is an ART/EMT token
      if (!['ART', 'EMT'].includes(requirementInstance.asset.product.assetClass)) {
        return reply.status(400).send({ 
          error: 'Platform co-acknowledgement only available for ART/EMT tokens' 
        })
      }

      // Check if requirement is already satisfied
      if (requirementInstance.status !== 'SATISFIED') {
        return reply.status(400).send({ 
          error: 'Requirement must be satisfied before platform co-acknowledgement' 
        })
      }

      // Update requirement with platform acknowledgement
      const updatedRequirement = await prisma.requirementInstance.update({
        where: { id: requirementId },
        data: {
          platformAcknowledged: true,
          platformAcknowledgedBy: user.sub,
          platformAcknowledgedAt: new Date(),
          platformAcknowledgmentReason: acknowledgmentReason
        }
      })

      return reply.send({
        id: updatedRequirement.id,
        platformAcknowledged: updatedRequirement.platformAcknowledged,
        platformAcknowledgedBy: updatedRequirement.platformAcknowledgedBy,
        platformAcknowledgedAt: updatedRequirement.platformAcknowledgedAt?.toISOString(),
        platformAcknowledgmentReason: updatedRequirement.platformAcknowledgmentReason
      })
    } catch (error: any) {
      console.error('Error platform acknowledging requirement:', error)
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Requirement not found' })
      }
      return reply.status(500).send({ error: 'Failed to platform acknowledge requirement' })
    }
  })

  // GET /v1/compliance/requirements/:requirementId/platform-status - Get platform acknowledgement status
  app.get('/compliance/requirements/:requirementId/platform-status', {
    schema: {
      summary: 'Get platform acknowledgement status for a requirement',
      description: 'Retrieve platform acknowledgement status and details for a specific requirement',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['requirementId'],
        properties: {
          requirementId: { type: 'string', description: 'Requirement instance ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            platformAcknowledged: { type: 'boolean' },
            platformAcknowledgedBy: { type: 'string' },
            platformAcknowledgedAt: { type: 'string' },
            platformAcknowledgmentReason: { type: 'string' },
            platformAcknowledger: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' }
              }
            },
            assetClass: { type: 'string' },
            requiresPlatformAcknowledgement: { type: 'boolean' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { requirementId } = req.params as { requirementId: string }

      // Get requirement instance with related data
      const requirementInstance = await prisma.requirementInstance.findUnique({
        where: { id: requirementId },
        include: {
          asset: {
            include: {
              product: true
            }
          },
          platformAcknowledger: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!requirementInstance) {
        return reply.status(404).send({ error: 'Requirement instance not found' })
      }

      const assetClass = requirementInstance.asset.product.assetClass
      const requiresPlatformAcknowledgement = ['ART', 'EMT'].includes(assetClass)

      return reply.send({
        id: requirementInstance.id,
        platformAcknowledged: requirementInstance.platformAcknowledged,
        platformAcknowledgedBy: requirementInstance.platformAcknowledgedBy,
        platformAcknowledgedAt: requirementInstance.platformAcknowledgedAt?.toISOString(),
        platformAcknowledgmentReason: requirementInstance.platformAcknowledgmentReason,
        platformAcknowledger: requirementInstance.platformAcknowledger,
        assetClass,
        requiresPlatformAcknowledgement
      })
    } catch (error: any) {
      console.error('Error fetching platform status:', error)
      return reply.status(500).send({ error: 'Failed to fetch platform status' })
    }
  })

  // GET /v1/compliance/assets/:assetId/export - Export all compliance data for an asset
  app.get('/compliance/assets/:assetId/export', {
    schema: {
      summary: 'Export all compliance data for an asset',
      description: 'Download comprehensive compliance report for an asset including all requirements and evidence',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string', description: 'ID of the asset' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['zip', 'json', 'csv'],
            default: 'zip',
            description: 'Export format: zip (with evidence files), json (data only), csv (spreadsheet analysis)'
          }
        }
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
          description: 'File containing asset compliance report (format depends on format parameter)'
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId } = req.params as { assetId: string }
      const { format = 'zip' } = req.query as { format?: 'zip' | 'json' | 'csv' }

      // Get asset with all related data
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          product: {
            include: {
              organization: true
            }
          }
        }
      })

      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }

      // Get all requirement instances for this asset
      const requirementInstances = await prisma.requirementInstance.findMany({
        where: { assetId },
        include: {
          requirementTemplate: {
            include: {
              regime: true
            }
          },
          evidence: true
        },
        orderBy: { createdAt: 'asc' }
      })

      // Get all evidence for this asset
      const allEvidence = await prisma.evidence.findMany({
        where: {
          requirementInstance: {
            assetId: assetId
          }
        },
        orderBy: { uploadedAt: 'desc' }
      })

      // Create comprehensive asset compliance manifest
      const manifest = {
        asset: {
          id: asset.id,
          assetRef: asset.assetRef,
          ledger: asset.ledger,
          network: asset.network,
          code: asset.code,
          status: asset.status,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        },
        product: {
          id: asset.product.id,
          name: asset.product.name,
          description: asset.product.description,
          assetClass: asset.product.assetClass,
          targetMarkets: asset.product.targetMarkets
        },
        organization: {
          id: asset.product.organization.id,
          name: asset.product.organization.name,
          legalName: asset.product.organization.legalName,
          country: asset.product.organization.country,
          jurisdiction: asset.product.organization.jurisdiction
        },
        compliance: {
          totalRequirements: requirementInstances.length,
          requirementsByStatus: {
            REQUIRED: requirementInstances.filter(r => r.status === 'REQUIRED').length,
            SATISFIED: requirementInstances.filter(r => r.status === 'SATISFIED').length,
            EXCEPTION: requirementInstances.filter(r => r.status === 'EXCEPTION').length
          },
          totalEvidenceFiles: allEvidence.length,
          platformAcknowledgedRequirements: requirementInstances.filter(r => r.platformAcknowledged).length
        },
        requirementInstances: requirementInstances.map((req: any) => ({
          id: req.id,
          status: req.status,
          rationale: req.rationale,
          exceptionReason: req.exceptionReason,
          platformAcknowledged: req.platformAcknowledged,
          platformAcknowledgedAt: req.platformAcknowledgedAt,
          platformAcknowledgmentReason: req.platformAcknowledgmentReason,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          requirementTemplate: {
            id: req.requirementTemplate.id,
            name: req.requirementTemplate.name,
            description: req.requirementTemplate.description,
            regime: {
              id: req.requirementTemplate.regime.id,
              name: req.requirementTemplate.regime.name,
              jurisdiction: req.requirementTemplate.regime.jurisdiction,
              version: req.requirementTemplate.regime.version
            }
          },
          evidenceCount: req.evidence.length,
          evidence: req.evidence.map((ev: any) => ({
            id: ev.id,
            fileName: ev.fileName,
            fileSize: ev.fileSize,
            fileType: ev.fileType,
            uploadedAt: ev.uploadedAt,
            uploadedBy: ev.uploadedBy,
            description: ev.description
          }))
        })),
        exportedAt: new Date().toISOString(),
        bundleVersion: '1.0',
        exportType: 'asset_compliance_report'
      }

      // Set CORS headers
      reply.header('Access-Control-Allow-Origin', 'http://localhost:3000')
      reply.header('Access-Control-Allow-Credentials', 'true')

      // Handle different export formats
      if (format === 'json') {
        // JSON export - data only
        const bundleName = `asset-compliance-${asset.code}-${Date.now()}.json`
        reply.header('Content-Type', 'application/json')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)
        return reply.send(JSON.stringify(manifest, null, 2))
      } else if (format === 'csv') {
        // CSV export - structured data for spreadsheet analysis
        const bundleName = `asset-compliance-${asset.code}-${Date.now()}.csv`
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)
        
        // Generate CSV data
        const csvRows = []
        
        // Header row
        csvRows.push([
          'Category',
          'Field Name', 
          'Field Value',
          'Data Type',
          'Description'
        ])
        
        // Asset data
        csvRows.push(['Asset', 'Code', manifest.asset.code, 'String', 'Asset code/symbol'])
        csvRows.push(['Asset', 'Reference', manifest.asset.assetRef, 'String', 'Full asset reference'])
        csvRows.push(['Asset', 'Ledger', manifest.asset.ledger, 'String', 'Blockchain ledger'])
        csvRows.push(['Asset', 'Network', manifest.asset.network, 'String', 'Network environment'])
        csvRows.push(['Asset', 'Status', manifest.asset.status, 'String', 'Asset status'])
        
        // Product data
        csvRows.push(['Product', 'Name', manifest.product.name, 'String', 'Product name'])
        csvRows.push(['Product', 'Asset Class', manifest.product.assetClass, 'String', 'Product asset class'])
        csvRows.push(['Product', 'Target Markets', manifest.product.targetMarkets.join('; '), 'String', 'Target market jurisdictions'])
        
        // Organization data
        csvRows.push(['Organization', 'Name', manifest.organization.name, 'String', 'Organization name'])
        csvRows.push(['Organization', 'Country', manifest.organization.country, 'String', 'Country of incorporation'])
        csvRows.push(['Organization', 'Jurisdiction', manifest.organization.jurisdiction, 'String', 'Regulatory jurisdiction'])
        
        // Compliance summary
        csvRows.push(['Compliance', 'Total Requirements', manifest.compliance.totalRequirements, 'Number', 'Total number of compliance requirements'])
        csvRows.push(['Compliance', 'Required Status', manifest.compliance.requirementsByStatus.REQUIRED, 'Number', 'Requirements with REQUIRED status'])
        csvRows.push(['Compliance', 'Satisfied Status', manifest.compliance.requirementsByStatus.SATISFIED, 'Number', 'Requirements with SATISFIED status'])
        csvRows.push(['Compliance', 'Exception Status', manifest.compliance.requirementsByStatus.EXCEPTION, 'Number', 'Requirements with EXCEPTION status'])
        csvRows.push(['Compliance', 'Total Evidence Files', manifest.compliance.totalEvidenceFiles, 'Number', 'Total number of evidence files'])
        csvRows.push(['Compliance', 'Platform Acknowledged', manifest.compliance.platformAcknowledgedRequirements, 'Number', 'Requirements acknowledged by platform'])
        
        // Individual requirements
        manifest.requirementInstances.forEach((req: any, index: number) => {
          csvRows.push(['Requirement', `Req ${index + 1} Name`, req.requirementTemplate.name, 'String', 'Requirement template name'])
          csvRows.push(['Requirement', `Req ${index + 1} Status`, req.status, 'String', 'Current requirement status'])
          csvRows.push(['Requirement', `Req ${index + 1} Regime`, req.requirementTemplate.regime.name, 'String', 'Regulatory regime'])
          csvRows.push(['Requirement', `Req ${index + 1} Evidence Count`, req.evidenceCount, 'Number', 'Number of evidence files'])
          if (req.platformAcknowledged) {
            csvRows.push(['Requirement', `Req ${index + 1} Platform Acknowledged`, 'Yes', 'String', 'Platform acknowledgement status'])
          }
        })
        
        // Export metadata
        csvRows.push(['Export', 'Exported At', new Date(manifest.exportedAt).toISOString(), 'DateTime', 'Export timestamp'])
        csvRows.push(['Export', 'Bundle Version', manifest.bundleVersion, 'String', 'Export format version'])
        
        // Convert to CSV format
        const csvContent = csvRows.map(row => 
          row.map(field => {
            // Escape fields that contain commas, quotes, or newlines
            const fieldStr = String(field || '')
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
              return `"${fieldStr.replace(/"/g, '""')}"`
            }
            return fieldStr
          }).join(',')
        ).join('\n')
        
        return reply.send(csvContent)
      } else {
        // ZIP export - with evidence files (default)
        const bundleName = `asset-compliance-${asset.code}-${Date.now()}.zip`
        reply.header('Content-Type', 'application/zip')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)

        // Create archive
        const archive = archiver('zip', { zlib: { level: 9 } })
        
        // Use reply.raw but ensure headers are sent first
        reply.raw.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
        archive.pipe(reply.raw)

        // Add evidence files organized by requirement
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const uploadsDir = path.join(__dirname, '../../../uploads')
        
        for (const req of requirementInstances) {
          const reqDir = `requirements/${req.requirementTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}`
          
          for (const evidenceItem of req.evidence) {
            const filePath = path.join(uploadsDir, evidenceItem.uploadPath)
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: `${reqDir}/evidence/${evidenceItem.fileName}` })
            }
          }
        }

        // Add comprehensive compliance manifest
        archive.append(JSON.stringify(manifest, null, 2), { name: 'asset-compliance-manifest.json' })

        // Add individual requirement summaries
        for (const req of requirementInstances) {
          const reqSummary = {
            requirement: req.requirementTemplate,
            status: req.status,
            rationale: req.rationale,
            evidence: req.evidence,
            platformAcknowledgement: {
              acknowledged: req.platformAcknowledged,
              acknowledgedAt: req.platformAcknowledgedAt,
              reason: req.platformAcknowledgmentReason
            }
          }
          
          const reqDir = `requirements/${req.requirementTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}`
          archive.append(JSON.stringify(reqSummary, null, 2), { name: `${reqDir}/requirement-summary.json` })
        }

        // Finalize archive
        await archive.finalize()
      }

    } catch (error: any) {
      console.error('Error creating asset compliance export:', error)
      return reply.status(500).send({ error: 'Failed to create asset compliance export' })
    }
  })

  // GET /v1/compliance/export - Export filtered compliance requirements
  app.get('/compliance/export', {
    schema: {
      summary: 'Export filtered compliance requirements',
      description: 'Download compliance report for all requirements matching the specified filters',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          assetId: { type: 'string', description: 'Filter by asset ID' },
          status: { type: 'string', enum: ['REQUIRED', 'SATISFIED', 'EXCEPTION'], description: 'Filter by requirement status' },
          regime: { type: 'string', description: 'Filter by regulatory regime' },
          format: {
            type: 'string',
            enum: ['zip', 'json', 'csv'],
            default: 'zip',
            description: 'Export format: zip (with evidence files), json (data only), csv (spreadsheet analysis)'
          },
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100, description: 'Maximum number of requirements to export' }
        }
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
          description: 'File containing filtered compliance report (format depends on format parameter)'
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: TenantRequest, reply) => {
    // Apply tenant middleware
    await tenantMiddleware(req, reply)
    await requireActiveTenant(req, reply)
    try {
      const { assetId, status, regime, format = 'zip', limit = 100 } = req.query as any

      // Build where clause based on filters
      const where: any = {}
      
      if (assetId) {
        where.assetId = assetId
      }
      
      if (status) {
        where.status = status
      }
      
      if (regime) {
        where.requirementTemplate = {
          regime: { id: regime }
        }
      }

      // Get filtered requirement instances
      const requirementInstances = await prisma.requirementInstance.findMany({
        where,
        include: {
          requirementTemplate: {
            include: {
              regime: true
            }
          },
          asset: {
            include: {
              product: {
                include: {
                  organization: true
                }
              }
            }
          },
          evidence: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      if (requirementInstances.length === 0) {
        return reply.status(400).send({ error: 'No requirements found matching the specified filters' })
      }

      // Group by asset for better organization
      const assetsMap = new Map()
      for (const req of requirementInstances) {
        const assetId = req.assetId
        if (!assetsMap.has(assetId)) {
          assetsMap.set(assetId, {
            asset: req.asset,
            requirements: []
          })
        }
        assetsMap.get(assetId).requirements.push(req)
      }

      // Create comprehensive filtered export manifest
      const manifest = {
        export: {
          filters: {
            assetId: assetId || null,
            status: status || null,
            regime: regime || null,
            limit: limit
          },
          totalRequirements: requirementInstances.length,
          totalAssets: assetsMap.size,
          exportedAt: new Date().toISOString(),
          bundleVersion: '1.0',
          exportType: 'filtered_compliance_report'
        },
        summary: {
          requirementsByStatus: {
            REQUIRED: requirementInstances.filter(r => r.status === 'REQUIRED').length,
            SATISFIED: requirementInstances.filter(r => r.status === 'SATISFIED').length,
            EXCEPTION: requirementInstances.filter(r => r.status === 'EXCEPTION').length
          },
          totalEvidenceFiles: requirementInstances.reduce((sum, req) => sum + req.evidence.length, 0),
          platformAcknowledgedRequirements: requirementInstances.filter(r => r.platformAcknowledged).length
        },
        assets: Array.from(assetsMap.values()).map(({ asset, requirements }) => ({
          asset: {
            id: asset.id,
            assetRef: asset.assetRef,
            ledger: asset.ledger,
            network: asset.network,
            code: asset.code,
            status: asset.status
          },
          product: {
            id: asset.product.id,
            name: asset.product.name,
            assetClass: asset.product.assetClass,
            targetMarkets: asset.product.targetMarkets
          },
          organization: {
            id: asset.product.organization.id,
            name: asset.product.organization.name,
            country: asset.product.organization.country,
            jurisdiction: asset.product.organization.jurisdiction
          },
          requirements: requirements.map((req: any) => ({
            id: req.id,
            status: req.status,
            rationale: req.rationale,
            exceptionReason: req.exceptionReason,
            platformAcknowledged: req.platformAcknowledged,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            requirementTemplate: {
              id: req.requirementTemplate.id,
              name: req.requirementTemplate.name,
              description: req.requirementTemplate.description,
              regime: {
                id: req.requirementTemplate.regime.id,
                name: req.requirementTemplate.regime.name,
                jurisdiction: req.requirementTemplate.regime.jurisdiction
              }
            },
            evidenceCount: req.evidence.length,
            evidence: req.evidence.map((ev: any) => ({
              id: ev.id,
              fileName: ev.fileName,
              fileSize: ev.fileSize,
              fileType: ev.fileType,
              uploadedAt: ev.uploadedAt,
              uploadedBy: ev.uploadedBy
            }))
          }))
        }))
      }

      // Set CORS headers
      reply.header('Access-Control-Allow-Origin', 'http://localhost:3000')
      reply.header('Access-Control-Allow-Credentials', 'true')

      // Handle different export formats
      if (format === 'json') {
        // JSON export - data only
        const bundleName = `filtered-compliance-${Date.now()}.json`
        reply.header('Content-Type', 'application/json')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)
        return reply.send(JSON.stringify(manifest, null, 2))
      } else if (format === 'csv') {
        // CSV export - structured data for spreadsheet analysis
        const bundleName = `filtered-compliance-${Date.now()}.csv`
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)
        
        // Generate CSV data
        const csvRows = []
        
        // Header row
        csvRows.push([
          'Asset Code',
          'Asset Reference',
          'Product Name',
          'Organization',
          'Requirement Name',
          'Regime',
          'Status',
          'Evidence Count',
          'Platform Acknowledged',
          'Created Date',
          'Updated Date'
        ])
        
        // Add data rows
        for (const assetData of manifest.assets) {
          for (const req of assetData.requirements) {
            csvRows.push([
              assetData.asset.code,
              assetData.asset.assetRef,
              assetData.product.name,
              assetData.organization.name,
              req.requirementTemplate.name,
              req.requirementTemplate.regime.name,
              req.status,
              req.evidenceCount,
              req.platformAcknowledged ? 'Yes' : 'No',
              new Date(req.createdAt).toISOString(),
              new Date(req.updatedAt).toISOString()
            ])
          }
        }
        
        // Convert to CSV format
        const csvContent = csvRows.map(row => 
          row.map(field => {
            // Escape fields that contain commas, quotes, or newlines
            const fieldStr = String(field || '')
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
              return `"${fieldStr.replace(/"/g, '""')}"`
            }
            return fieldStr
          }).join(',')
        ).join('\n')
        
        return reply.send(csvContent)
      } else {
        // ZIP export - with evidence files (default)
        const bundleName = `filtered-compliance-${Date.now()}.zip`
        reply.header('Content-Type', 'application/zip')
        reply.header('Content-Disposition', `attachment; filename="${bundleName}"`)

        // Create archive
        const archive = archiver('zip', { zlib: { level: 9 } })
        
        // Use reply.raw but ensure headers are sent first
        reply.raw.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
        archive.pipe(reply.raw)

        // Add evidence files organized by asset and requirement
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const uploadsDir = path.join(__dirname, '../../../uploads')
        
        for (const assetData of manifest.assets) {
          const assetDir = `assets/${assetData.asset.code.replace(/[^a-zA-Z0-9]/g, '_')}`
          
          for (const req of assetData.requirements) {
            const reqDir = `${assetDir}/requirements/${req.requirementTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}`
            
            for (const evidenceItem of req.evidence) {
              const filePath = path.join(uploadsDir, evidenceItem.uploadPath)
              if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: `${reqDir}/evidence/${evidenceItem.fileName}` })
              }
            }
          }
        }

        // Add comprehensive manifest
        archive.append(JSON.stringify(manifest, null, 2), { name: 'filtered-compliance-manifest.json' })

        // Add individual asset summaries
        for (const assetData of manifest.assets) {
          const assetDir = `assets/${assetData.asset.code.replace(/[^a-zA-Z0-9]/g, '_')}`
          archive.append(JSON.stringify(assetData, null, 2), { name: `${assetDir}/asset-summary.json` })
        }

        // Finalize archive
        await archive.finalize()
      }

    } catch (error: any) {
      console.error('Error creating filtered compliance export:', error)
      return reply.status(500).send({ error: 'Failed to create filtered compliance export' })
    }
  })

}

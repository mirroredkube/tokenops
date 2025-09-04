import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { policyKernel, PolicyFacts } from '../../lib/policyKernel.js'

const prisma = new PrismaClient()

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
  }, async (req, reply) => {
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
  }, async (req, reply) => {
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
  }, async (req, reply) => {
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
        instances: instances.map(instance => ({
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
  }, async (req, reply) => {
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

  // 5. GET /v1/compliance/instances - List requirement instances
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
  }, async (req, reply) => {
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
      
      const [instances, total] = await Promise.all([
        prisma.requirementInstance.findMany({
          where,
          include: {
            requirementTemplate: {
              include: {
                regime: true
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
      
      return reply.send({
        instances: instances.map(instance => ({
          id: instance.id,
          status: instance.status,
          rationale: instance.rationale,
          requirementTemplate: {
            id: instance.requirementTemplate.id,
            name: instance.requirementTemplate.name,
            regime: instance.requirementTemplate.regime
          }
        })),
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
  }, async (req, reply) => {
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
  }, async (req, reply) => {
    try {
      const { requirementId } = req.params as { requirementId: string }
      const { status, exceptionReason, rationale } = req.body as any

      // Get user ID from auth context
      const userId = (req as any).user?.id
      if (!userId) {
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
          verifierId: userId,
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
  }, async (req, reply) => {
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

      // Get user ID from auth context
      const userId = (req as any).user?.id
      if (!userId) {
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
          uploadedBy: userId
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
  }, async (req, reply) => {
    try {
      // Get user ID from auth context
      const userId = (req as any).user?.id
      if (!userId) {
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
          uploadedBy: userId
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
  }, async (req, reply) => {
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
}

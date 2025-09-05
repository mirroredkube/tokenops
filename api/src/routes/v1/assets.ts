import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { generateAssetRef } from './shared.js'
import { PrismaClient } from '@prisma/client'
import { policyKernel, PolicyFacts } from '../../lib/policyKernel.js'

const prisma = new PrismaClient()

// ---------- Validation Schemas ----------
const AssetCreateSchema = z.object({
  productId: z.string().min(1),
  ledger: z.enum(["xrpl", "hedera", "ethereum"]),
  network: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
  issuer: z.string().min(1),
  code: z.string().min(1),
  assetClass: z.enum(["OTHER", "ART", "EMT"]).default("OTHER"),
  decimals: z.number().int().min(0).max(18),
  complianceMode: z.enum(["OFF", "RECORD_ONLY", "GATED_BEFORE"]).default("RECORD_ONLY"),
  controls: z.object({
    requireAuth: z.boolean().optional(),
    freeze: z.boolean().optional(),
    clawback: z.boolean().optional(),
    transferFeeBps: z.number().int().min(0).max(10000).optional()
  }).optional(),
  registry: z.object({
    jurisdiction: z.string().optional(),
    lei: z.string().optional(),
    micaClass: z.string().optional(),
    whitePaperRef: z.string().url().optional(),
    reserveAssets: z.string().optional(),
    custodian: z.string().optional(),
    riskAssessment: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const AssetUpdateSchema = AssetCreateSchema.partial().extend({
  status: z.enum(["draft", "active", "paused", "retired"]).optional()
})

export default async function assetRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Debug endpoint to test JSON serialization
  app.get('/assets/:assetId/debug', async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    try {
      // Test raw SQL
      const rawResult = await prisma.$queryRaw`
        SELECT controls, registry, "assetClass" FROM "Asset" WHERE id = ${assetId}
      ` as any[]
      
      // Test Prisma query
      const prismaResult = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { controls: true, registry: true, assetClass: true }
      })
      
      return reply.send({
        rawSQL: rawResult[0],
        prismaQuery: prismaResult,
        comparison: {
          rawControls: rawResult[0]?.controls,
          prismaControls: prismaResult?.controls,
          rawRegistry: rawResult[0]?.registry,
          prismaRegistry: prismaResult?.registry
        }
      })
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })
  // 1. POST /v1/assets - Create new asset
  app.post('/assets', {
    schema: {
      summary: 'Create new asset',
      description: 'Register a new asset with ledger binding and policy configuration',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['productId', 'ledger', 'issuer', 'code', 'decimals'],
        properties: {
          productId: {
            type: 'string',
            description: 'Product ID that this asset belongs to'
          },
          ledger: { 
            type: 'string', 
            enum: ['xrpl', 'hedera', 'ethereum'],
            description: 'Target ledger for the asset'
          },
          network: { 
            type: 'string', 
            enum: ['mainnet', 'testnet', 'devnet'],
            default: 'testnet',
            description: 'Network environment'
          },
          issuer: { 
            type: 'string', 
            description: 'Issuer address/identifier on the ledger'
          },
          code: { 
            type: 'string', 
            description: 'Currency code/symbol'
          },
          assetClass: { 
            type: 'string', 
            enum: ['OTHER', 'ART', 'EMT'],
            default: 'OTHER',
            description: 'Asset class for compliance evaluation (OTHER, ART, EMT)'
          },
          decimals: { 
            type: 'number', 
            minimum: 0,
            maximum: 18,
            description: 'Number of decimal places'
          },
          complianceMode: { 
            type: 'string', 
            enum: ['OFF', 'RECORD_ONLY', 'GATED_BEFORE'],
            default: 'RECORD_ONLY',
            description: 'Compliance enforcement mode'
          },
          controls: {
            type: 'object',
            properties: {
              requireAuth: { type: 'boolean' },
              freeze: { type: 'boolean' },
              clawback: { type: 'boolean' },
              transferFeeBps: { type: 'number', minimum: 0, maximum: 10000 }
            }
          },
          registry: {
            type: 'object',
            properties: {
              isin: { type: 'string' },
              lei: { type: 'string' },
              micaClass: { type: 'string' },
              jurisdiction: { type: 'string' }
            }
          },
          metadata: { type: 'object' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetRef: { type: 'string' },
            ledger: { type: 'string' },
            network: { type: 'string' },
            issuer: { type: 'string' },
            code: { type: 'string' },
            decimals: { type: 'number' },
            complianceMode: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = AssetCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    const assetData = parsed.data
    
    try {
      // Generate asset reference
      const assetRef = generateAssetRef(assetData.ledger, assetData.network, assetData.issuer, assetData.code)
      
      // Check if asset already exists
      const existingAsset = await prisma.asset.findUnique({
        where: { assetRef }
      })
      
      if (existingAsset) {
        return reply.status(409).send({ error: 'Asset already exists' })
      }
      
      // Validate that the product exists and belongs to the user's organization
      const product = await prisma.product.findUnique({
        where: { id: assetData.productId },
        include: {
          organization: true
        }
      });
      
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }
      
      // TODO: Add user authentication check to verify organization ownership
      // For now, we'll allow any valid product
      
      // Find issuer address - must be APPROVED
      const issuerAddress = await prisma.issuerAddress.findFirst({
        where: {
          address: assetData.issuer,
          ledger: assetData.ledger.toUpperCase() as any,
          network: assetData.network.toUpperCase() as any,
          status: 'APPROVED', // Only allow APPROVED addresses
          organizationId: product.organizationId // Must belong to same organization
        }
      });
      
      if (!issuerAddress) {
        return reply.status(422).send({ 
          error: 'Issuer address not found or not approved',
          message: 'The specified issuer address must be registered and approved before creating assets. Please register the address first and wait for approval.'
        });
      }
      
      // Create asset in database
      const asset = await prisma.asset.create({
        data: {
          assetRef,
          productId: product.id,
          ledger: assetData.ledger.toUpperCase() as any,
          network: assetData.network.toUpperCase() as any,
          issuingAddressId: issuerAddress.id,
          code: assetData.code,
          assetClass: assetData.assetClass,
          decimals: assetData.decimals,
          complianceMode: assetData.complianceMode.toUpperCase() as any,
          controls: assetData.controls,
          registry: assetData.registry,
          metadata: assetData.metadata,
          status: 'DRAFT'
        }
      })
      
      console.log('Asset created:', asset)
      
      // Evaluate compliance and create requirement instances
      let complianceEvaluation: any = null
      let requirementInstances: any[] = []
      
      try {
        // Build policy facts from asset and product data
        const facts: PolicyFacts = {
          issuerCountry: product.organization.country,
          assetClass: asset.assetClass, // Use asset-level asset class instead of product-level
          targetMarkets: product.targetMarkets || [],
          ledger: asset.ledger,
          distributionType: 'private', // Default - could be enhanced with product data
          investorAudience: 'professional', // Default - could be enhanced with product data
          isCaspInvolved: true, // Default - could be enhanced with product data
          transferType: 'CASP_TO_CASP' // Default - could be enhanced with product data
        }
        
        // Evaluate compliance
        complianceEvaluation = await policyKernel.evaluateFacts(facts)
        
        // Create requirement instances
        await policyKernel.createRequirementInstances(asset.id, facts)
        
        // Get created instances for response
        requirementInstances = await prisma.requirementInstance.findMany({
          where: { assetId: asset.id },
          include: {
            requirementTemplate: {
              include: {
                regime: true
              }
            }
          }
        })
        
        console.log(`✅ Compliance evaluation completed: ${complianceEvaluation.requirementInstances.length} requirements`)
      } catch (complianceError: any) {
        console.error('⚠️ Compliance evaluation failed:', complianceError)
        // Don't fail asset creation if compliance evaluation fails
        // Asset can still be created, compliance can be evaluated later
      }
      
      return reply.status(201).send({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger.toLowerCase(),
        network: asset.network.toLowerCase(),
        issuer: issuerAddress.address, // Return issuer address for backward compatibility
        code: asset.code,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode.toLowerCase(),
        status: asset.status.toLowerCase(),
        createdAt: asset.createdAt.toISOString(),
        product: {
          id: product.id,
          name: product.name,
          assetClass: product.assetClass
        },
        organization: {
          id: product.organization.id,
          name: product.organization.name
        },
        compliance: {
          evaluated: complianceEvaluation !== null,
          requirementCount: requirementInstances.length,
          requirements: requirementInstances.map(instance => ({
            id: instance.id,
            status: instance.status,
            template: {
              id: instance.requirementTemplate.id,
              name: instance.requirementTemplate.name,
              regime: instance.requirementTemplate.regime.name
            }
          })),
          enforcementPlan: complianceEvaluation?.enforcementPlan || null
        }
      })
    } catch (error: any) {
      console.error('Error creating asset:', error)
      return reply.status(400).send({ error: 'Failed to create asset' })
    }
  })

  // 2. GET /v1/assets/{assetId} - Get asset details (temporarily replaced with working debug logic)
  app.get('/assets/:assetId', async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    try {
      // Use the EXACT same logic as the working debug endpoint
      const rawResult = await prisma.$queryRaw`
        SELECT controls, registry, "assetClass", id, "assetRef", ledger, network, 
               "issuingAddressId", "productId", code, decimals, "complianceMode", 
               metadata, status, "createdAt", "updatedAt"
        FROM "Asset" WHERE id = ${assetId}
      ` as any[]
      
      if (!rawResult || rawResult.length === 0) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      const asset = rawResult[0]
      
      // Get related data
      const [issuingAddress, product, requirementInstances] = await Promise.all([
        prisma.issuerAddress.findFirst({
          where: { id: asset.issuingAddressId }
        }),
        prisma.product.findUnique({
          where: { id: asset.productId },
          include: { organization: true }
        }),
        prisma.requirementInstance.findMany({
          where: { assetId: assetId },
          include: {
            requirementTemplate: {
              include: { regime: true }
            }
          }
        })
      ])
      
      return reply.send({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger.toLowerCase(),
        network: asset.network.toLowerCase(),
        issuer: issuingAddress?.address || 'unknown',
        code: asset.code,
        assetClass: asset.assetClass,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode.toLowerCase(),
        controls: asset.controls || {},
        registry: asset.registry || {},
        metadata: asset.metadata || {},
        status: asset.status.toLowerCase(),
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        product: product ? {
          id: product.id,
          name: product.name,
          assetClass: product.assetClass
        } : null,
        organization: product?.organization ? {
          id: product.organization.id,
          name: product.organization.name,
          country: product.organization.country
        } : null,
        compliance: {
          requirementCount: requirementInstances.length,
          requirements: requirementInstances.map(instance => ({
            id: instance.id,
            status: instance.status,
            template: {
              id: instance.requirementTemplate.id,
              name: instance.requirementTemplate.name,
              regime: instance.requirementTemplate.regime.name
            }
          }))
        }
      })
    } catch (error: any) {
      console.error('Error fetching asset:', error)
      return reply.status(500).send({ error: 'Failed to fetch asset' })
    }
  })
  
  // OLD route implementation (keep for reference)
  app.get('/assets/:assetId/old', {
    schema: {
      summary: 'Get asset details',
      description: 'Retrieve asset configuration and metadata',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string', description: 'Asset ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetRef: { type: 'string' },
            ledger: { type: 'string' },
            network: { type: 'string' },
            issuer: { type: 'string' },
            code: { type: 'string' },
            assetClass: { type: 'string' },
            decimals: { type: 'number' },
            complianceMode: { type: 'string' },
            controls: { type: 'object' },
            registry: { type: 'object' },
            metadata: { type: 'object' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            product: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                assetClass: { type: 'string' }
              }
            },
            organization: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                country: { type: 'string' }
              }
            },
            compliance: {
              type: 'object',
              properties: {
                requirementCount: { type: 'number' },
                requirements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string' },
                      template: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          regime: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    try {
      // Get asset data using the same approach as the working debug endpoint
      const assetResult = await prisma.$queryRaw`
        SELECT 
          id, "assetRef", ledger, network, "issuingAddressId", "productId", 
          code, "assetClass", decimals, "complianceMode", controls, registry, 
          metadata, status, "createdAt", "updatedAt"
        FROM "Asset" 
        WHERE id = ${assetId}
      ` as any[]
      
      if (!assetResult || assetResult.length === 0) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      const asset = assetResult[0]
      
      // Get related data separately
      const [issuingAddress, product, requirementInstances] = await Promise.all([
        prisma.issuerAddress.findFirst({
          where: { id: asset.issuingAddressId }
        }),
        prisma.product.findUnique({
          where: { id: asset.productId },
          include: {
            organization: true
          }
        }),
        prisma.requirementInstance.findMany({
          where: { assetId: assetId },
          include: {
            requirementTemplate: {
              include: {
                regime: true
              }
            }
          }
        })
      ])
      
      // Use the JSON fields directly from raw SQL (same as debug endpoint)
      const controls = asset.controls || {}
      const registry = asset.registry || {}
      const metadata = asset.metadata || {}
      
      return reply.send({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger.toLowerCase(),
        network: asset.network.toLowerCase(),
        issuer: issuingAddress?.address || 'unknown', // Backward compatibility
        code: asset.code,
        assetClass: asset.assetClass,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode.toLowerCase(),
        controls: controls,
        registry: registry,
        metadata: metadata,
        status: asset.status.toLowerCase(),
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        product: product ? {
          id: product.id,
          name: product.name,
          assetClass: product.assetClass
        } : null,
        organization: product?.organization ? {
          id: product.organization.id,
          name: product.organization.name,
          country: product.organization.country
        } : null,
        compliance: {
          requirementCount: requirementInstances.length,
          requirements: requirementInstances.map(instance => ({
            id: instance.id,
            status: instance.status,
            template: {
              id: instance.requirementTemplate.id,
              name: instance.requirementTemplate.name,
              regime: instance.requirementTemplate.regime.name
            }
          }))
        }
      })
    } catch (error: any) {
      console.error('Error fetching asset:', error)
      return reply.status(500).send({ error: 'Failed to fetch asset' })
    }
  })

  // 3. PUT /v1/assets/{assetId} - Update asset
  app.put('/assets/:assetId', {
    schema: {
      summary: 'Update asset',
      description: 'Update asset configuration (draft assets only)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'retired'] },
          complianceMode: { type: 'string', enum: ['OFF', 'RECORD_ONLY', 'GATED_BEFORE'] },
          controls: { type: 'object' },
          registry: { type: 'object' },
          metadata: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetRef: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    const parsed = AssetUpdateSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' })
    }
    
    try {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      // Allow status changes for all assets, but restrict other updates to draft assets only
      const hasStatusChange = parsed.data.status !== undefined
      const hasOtherChanges = Object.keys(parsed.data).some(key => key !== 'status')
      
      if (!hasStatusChange && hasOtherChanges && asset.status !== 'DRAFT') {
        return reply.status(409).send({ error: 'Can only update draft assets' })
      }

      // Check platform acknowledgement for ART/EMT assets being activated
      if (hasStatusChange && parsed.data.status === 'active') {
        const assetWithProduct = await prisma.asset.findUnique({
          where: { id: assetId },
          include: {
            product: true,
            requirementInstances: {
              where: {
                status: 'SATISFIED',
                platformAcknowledged: false
              },
              include: {
                requirementTemplate: true
              }
            }
          }
        })

        if (assetWithProduct && ['ART', 'EMT'].includes(assetWithProduct.product.assetClass)) {
          // Check if there are any satisfied requirements that still need platform acknowledgement
          const pendingPlatformAck = assetWithProduct.requirementInstances.filter(req => {
            // Check if this requirement template requires platform acknowledgement
            const artEmtRequirements = [
              'mica-issuer-auth-art-emt',
              'mica-whitepaper-art',
              'mica-kyc-tier-art-emt',
              'mica-right-of-withdrawal',
              'mica-marketing-communications'
            ]
            return artEmtRequirements.includes(req.requirementTemplate.id)
          })

          if (pendingPlatformAck.length > 0) {
            return reply.status(422).send({
              error: 'Asset activation blocked by pending platform acknowledgement',
              message: 'ART/EMT assets require platform co-acknowledgement of all satisfied compliance requirements before activation',
              pendingPlatformAcknowledgements: pendingPlatformAck.map(req => ({
                requirementId: req.id,
                requirementName: req.requirementTemplate.name,
                templateId: req.requirementTemplate.id
              }))
            })
          }
        }
      }
      
      // Prepare update data
      const updateData: any = {}
      
      if (parsed.data.status) {
        updateData.status = parsed.data.status.toUpperCase() as any
      }
      if (parsed.data.complianceMode) {
        updateData.complianceMode = parsed.data.complianceMode.toUpperCase() as any
      }
      if (parsed.data.controls) {
        updateData.controls = parsed.data.controls
      }
      if (parsed.data.registry) {
        updateData.registry = parsed.data.registry
      }
      if (parsed.data.metadata) {
        updateData.metadata = parsed.data.metadata
      }
      
      // Update asset in database
      const updatedAsset = await prisma.asset.update({
        where: { id: assetId },
        data: updateData
      })
      
      return reply.send({
        id: updatedAsset.id,
        assetRef: updatedAsset.assetRef,
        status: updatedAsset.status.toLowerCase(),
        updatedAt: updatedAsset.updatedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error updating asset:', error)
      return reply.status(500).send({ error: 'Failed to update asset' })
    }
  })

  // 4. DELETE /v1/assets/{assetId} - Delete asset
  app.delete('/assets/:assetId', {
    schema: {
      summary: 'Delete asset',
      description: 'Delete asset (draft assets only)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string' }
        }
      },
      response: {
        204: { type: 'null' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    try {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      if (asset.status !== 'DRAFT') {
        return reply.status(409).send({ error: 'Can only delete draft assets' })
      }
      
      await prisma.asset.delete({
        where: { id: assetId }
      })
      
      return reply.status(204).send()
    } catch (error: any) {
      console.error('Error deleting asset:', error)
      return reply.status(500).send({ error: 'Failed to delete asset' })
    }
  })

  // 5. GET /v1/assets - List assets
  app.get('/assets', {
    schema: {
      summary: 'List assets',
      description: 'List assets with optional filtering',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Filter by product ID' },
          ledger: { type: 'string', enum: ['xrpl', 'hedera', 'ethereum'] },
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'retired'] },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
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
                  assetRef: { type: 'string' },
                  ledger: { type: 'string' },
                  network: { type: 'string' },
                  issuer: { type: 'string' },
                  code: { type: 'string' },
                  decimals: { type: 'number' },
                  complianceMode: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
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
                  },
                  compliance: {
                    type: 'object',
                    properties: {
                      requirementCount: { type: 'number' },
                      requirements: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            status: { type: 'string' },
                            template: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                regime: { type: 'string' }
                              }
                            }
                          }
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
    const { productId, ledger, status, limit = 20, offset = 0 } = req.query as any
    
    try {
      // Build where clause
      const where: any = {}
      
      if (productId) {
        where.productId = productId
      }
      
      if (ledger) {
        where.ledger = ledger.toUpperCase()
      }
      
      if (status) {
        where.status = status.toUpperCase()
      }
      
      // Get assets from database
      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            issuingAddress: true,
            product: {
              include: {
                organization: true
              }
            },
            requirementInstances: {
              include: {
                requirementTemplate: {
                  include: {
                    regime: true
                  }
                }
              }
            }
          }
        }),
        prisma.asset.count({ where })
      ])
      
      return reply.send({
        assets: assets.map(asset => ({
          id: asset.id,
          assetRef: asset.assetRef,
          ledger: asset.ledger.toLowerCase(),
          network: asset.network.toLowerCase(),
          issuer: asset.issuingAddress?.address || 'unknown', // Backward compatibility
          code: asset.code,
          decimals: asset.decimals,
          complianceMode: asset.complianceMode.toLowerCase(),
          status: asset.status.toLowerCase(),
          createdAt: asset.createdAt.toISOString(),
          product: {
            id: asset.product.id,
            name: asset.product.name,
            assetClass: asset.product.assetClass
          },
          organization: {
            id: asset.product.organization.id,
            name: asset.product.organization.name
          },
          compliance: {
            requirementCount: asset.requirementInstances.length,
            requirements: asset.requirementInstances.map(instance => ({
              id: instance.id,
              status: instance.status,
              template: {
                id: instance.requirementTemplate.id,
                name: instance.requirementTemplate.name,
                regime: instance.requirementTemplate.regime.name
              }
            }))
          }
        })),
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('Error listing assets:', error)
      return reply.status(500).send({ error: 'Failed to list assets' })
    }
  })


}

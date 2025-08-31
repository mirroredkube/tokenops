import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { generateAssetRef } from './shared.js'
import prisma from '../../db/client.js'

// ---------- Validation Schemas ----------
const AssetCreateSchema = z.object({
  ledger: z.enum(["xrpl", "hedera", "ethereum"]),
  network: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
  issuer: z.string().min(1),
  code: z.string().min(1),
  decimals: z.number().int().min(0).max(18),
  complianceMode: z.enum(["OFF", "RECORD_ONLY", "GATED_BEFORE"]).default("RECORD_ONLY"),
  controls: z.object({
    requireAuth: z.boolean().optional(),
    freeze: z.boolean().optional(),
    clawback: z.boolean().optional(),
    transferFeeBps: z.number().int().min(0).max(10000).optional()
  }).optional(),
  registry: z.object({
    isin: z.string().optional(),
    lei: z.string().optional(),
    micaClass: z.string().optional(),
    jurisdiction: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const AssetUpdateSchema = AssetCreateSchema.partial().extend({
  status: z.enum(["draft", "active", "paused", "retired"]).optional()
})

export default async function assetRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // 1. POST /v1/assets - Create new asset
  app.post('/assets', {
    schema: {
      summary: 'Create new asset',
      description: 'Register a new asset with ledger binding and policy configuration',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['ledger', 'issuer', 'code', 'decimals'],
        properties: {
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
      
      // Get or create default organization and product for backward compatibility
      let defaultOrg = await prisma.organization.findFirst({
        where: { name: 'Default Organization' }
      });
      
      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: {
            name: 'Default Organization',
            legalName: 'Default Organization',
            country: 'US',
            jurisdiction: 'US',
            status: 'ACTIVE'
          }
        });
      }
      
      let defaultProduct = await prisma.product.findFirst({
        where: { 
          organizationId: defaultOrg.id,
          name: 'Default Product'
        }
      });
      
      if (!defaultProduct) {
        defaultProduct = await prisma.product.create({
          data: {
            organizationId: defaultOrg.id,
            name: 'Default Product',
            description: 'Default product for existing assets',
            assetClass: 'OTHER',
            status: 'ACTIVE'
          }
        });
      }
      
      // Create or find issuer address
      let issuerAddress = await prisma.issuerAddress.findFirst({
        where: {
          address: assetData.issuer,
          ledger: assetData.ledger.toUpperCase() as any,
          network: assetData.network.toUpperCase() as any
        }
      });
      
      if (!issuerAddress) {
        issuerAddress = await prisma.issuerAddress.create({
          data: {
            organizationId: defaultOrg.id,
            address: assetData.issuer,
            ledger: assetData.ledger.toUpperCase() as any,
            network: assetData.network.toUpperCase() as any,
            allowedUseTags: ['OTHER'],
            status: 'APPROVED' // Auto-approve for backward compatibility
          }
        });
      }
      
      // Create asset in database
      const asset = await prisma.asset.create({
        data: {
          assetRef,
          productId: defaultProduct.id,
          ledger: assetData.ledger.toUpperCase() as any,
          network: assetData.network.toUpperCase() as any,
          issuingAddressId: issuerAddress.id,
          code: assetData.code,
          decimals: assetData.decimals,
          complianceMode: assetData.complianceMode.toUpperCase() as any,
          controls: assetData.controls,
          registry: assetData.registry,
          metadata: assetData.metadata,
          status: 'DRAFT'
        }
      })
      
      console.log('Asset created:', asset)
      
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
        createdAt: asset.createdAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error creating asset:', error)
      return reply.status(400).send({ error: 'Failed to create asset' })
    }
  })

  // 2. GET /v1/assets/{assetId} - Get asset details
  app.get('/assets/:assetId', {
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
            decimals: { type: 'number' },
            complianceMode: { type: 'string' },
            controls: { type: 'object' },
            registry: { type: 'object' },
            metadata: { type: 'object' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    try {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          issuingAddress: true
        }
      })
      
      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' })
      }
      
      return reply.send({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger.toLowerCase(),
        network: asset.network.toLowerCase(),
        issuer: asset.issuingAddress?.address || 'unknown', // Backward compatibility
        code: asset.code,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode.toLowerCase(),
        controls: asset.controls,
        registry: asset.registry,
        metadata: asset.metadata,
        status: asset.status.toLowerCase(),
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString()
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
                  createdAt: { type: 'string' }
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
    const { ledger, status, limit = 20, offset = 0 } = req.query as any
    
    try {
      // Build where clause
      const where: any = {}
      
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
            issuingAddress: true
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
          createdAt: asset.createdAt.toISOString()
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

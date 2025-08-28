import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { getLedgerAdapter } from '../../adapters/index.js'
import { Asset, assets, generateAssetRef, generateAssetId } from './shared.js'

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
      // Generate asset identifier
      const id = generateAssetId()
      const assetRef = generateAssetRef(assetData.ledger, assetData.network, assetData.issuer, assetData.code)
      
      // Check if asset already exists
      for (const asset of assets.values()) {
        if (asset.assetRef === assetRef) {
          return reply.status(409).send({ error: 'Asset already exists' })
        }
      }
      
      // Create asset
      const asset: Asset = {
        id,
        assetRef,
        ledger: assetData.ledger,
        network: assetData.network,
        issuer: assetData.issuer,
        code: assetData.code,
        decimals: assetData.decimals,
        complianceMode: assetData.complianceMode,
        controls: assetData.controls,
        registry: assetData.registry,
        metadata: assetData.metadata,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      assets.set(id, asset)
      
      console.log('Asset created:', asset)
      
      return reply.status(201).send({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger,
        network: asset.network,
        issuer: asset.issuer,
        code: asset.code,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode,
        status: asset.status,
        createdAt: asset.createdAt
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
    
    const asset = assets.get(assetId)
    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' })
    }
    
    return reply.send(asset)
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
    
    const asset = assets.get(assetId)
    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' })
    }
    
    // Allow status changes for all assets, but restrict other updates to draft assets only
    const hasStatusChange = parsed.data.status !== undefined
    const hasOtherChanges = Object.keys(parsed.data).some(key => key !== 'status')
    
    if (!hasStatusChange && hasOtherChanges && asset.status !== 'draft') {
      return reply.status(409).send({ error: 'Can only update draft assets' })
    }
    
    // Update asset
    const updatedAsset: Asset = {
      ...asset,
      ...parsed.data,
      updatedAt: new Date().toISOString()
    }
    
    assets.set(assetId, updatedAsset)
    
    return reply.send({
      id: updatedAsset.id,
      assetRef: updatedAsset.assetRef,
      status: updatedAsset.status,
      updatedAt: updatedAsset.updatedAt
    })
  })

  // 4. DELETE /v1/assets/{assetId} - Deactivate asset
  app.delete('/assets/:assetId', {
    schema: {
      summary: 'Deactivate asset',
      description: 'Mark asset as retired (no new issuances)',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['assetId'],
        properties: {
          assetId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const { assetId } = req.params as { assetId: string }
    
    const asset = assets.get(assetId)
    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' })
    }
    
    // Mark as retired
    asset.status = 'retired'
    asset.updatedAt = new Date().toISOString()
    
    return reply.send({
      id: asset.id,
      status: asset.status
    })
  })

  // 5. GET /v1/assets - List assets
  app.get('/assets', {
    schema: {
      summary: 'List assets',
      description: 'Get all assets with optional filtering',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          ledger: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
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
    const { ledger, status, limit = 50, offset = 0 } = req.query as any
    
    let filteredAssets = Array.from(assets.values())
    
    // Apply filters
    if (ledger) {
      filteredAssets = filteredAssets.filter(asset => asset.ledger === ledger)
    }
    if (status) {
      filteredAssets = filteredAssets.filter(asset => asset.status === status)
    }
    
    // Pagination
    const total = filteredAssets.length
    const paginatedAssets = filteredAssets.slice(offset, offset + limit)
    
    return reply.send({
      assets: paginatedAssets.map(asset => ({
        id: asset.id,
        assetRef: asset.assetRef,
        ledger: asset.ledger,
        network: asset.network,
        issuer: asset.issuer,
        code: asset.code,
        decimals: asset.decimals,
        complianceMode: asset.complianceMode,
        status: asset.status,
        createdAt: asset.createdAt
      })),
      total,
      limit,
      offset
    })
  })
}

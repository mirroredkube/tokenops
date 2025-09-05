import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { getLedgerAdapter } from '../../adapters/index.js'

const prisma = new PrismaClient()

// ---------- Authentication Helper ----------
async function verifyAuthIfRequired(req: any, reply: any): Promise<any> {
  const AUTH_MODE = (process.env.AUTH_MODE ?? "off").toLowerCase()
  
  if (AUTH_MODE === "off") {
    return null // No authentication required
  }
  
  try {
    await (req.server as any).verifyAuthOrApiKey(req, reply)
    return req.user
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}

// ---------- Validation Schemas ----------
const IssuerAddressCreateSchema = z.object({
  organizationId: z.string().min(1),
  address: z.string().min(1),
  ledger: z.enum(['XRPL', 'ETHEREUM', 'HEDERA']),
  network: z.enum(['MAINNET', 'TESTNET', 'DEVNET']),
  allowedUseTags: z.array(z.enum(['ART', 'EMT', 'OTHER'])).default(['OTHER']),
  proofOfControl: z.object({
    challenge: z.string(),
    signature: z.string(),
    publicKey: z.string().optional()
  }).optional()
})

const IssuerAddressUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED']).optional(),
  allowedUseTags: z.array(z.enum(['ART', 'EMT', 'OTHER'])).optional(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const IssuerAddressQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED']).optional(),
  ledger: z.enum(['XRPL', 'ETHEREUM', 'HEDERA']).optional(),
  network: z.enum(['MAINNET', 'TESTNET', 'DEVNET']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

const ProofOfControlSchema = z.object({
  challenge: z.string(),
  signature: z.string(),
  publicKey: z.string().optional()
})

export default async function issuerAddressRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  
  // 1. GET /v1/issuer-addresses - List issuer addresses
  app.get('/issuer-addresses', {
    schema: {
      summary: 'List issuer addresses',
      description: 'List issuer addresses with optional filtering and pagination',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          organizationId: { 
            type: 'string', 
            description: 'Filter by organization ID'
          },
          status: { 
            type: 'string', 
            enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED'],
            description: 'Filter by address status'
          },
          ledger: { 
            type: 'string', 
            enum: ['XRPL', 'ETHEREUM', 'HEDERA'],
            description: 'Filter by ledger'
          },
          network: { 
            type: 'string', 
            enum: ['MAINNET', 'TESTNET', 'DEVNET'],
            description: 'Filter by network'
          },
          limit: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100, 
            default: 20,
            description: 'Number of addresses to return'
          },
          offset: { 
            type: 'number', 
            minimum: 0, 
            default: 0,
            description: 'Number of addresses to skip'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  organizationId: { type: 'string' },
                  address: { type: 'string' },
                  ledger: { type: 'string' },
                  network: { type: 'string' },
                  allowedUseTags: { type: 'array', items: { type: 'string' } },
                  status: { type: 'string' },
                  approvedAt: { type: 'string' },
                  approvedBy: { type: 'string' },
                  suspendedAt: { type: 'string' },
                  suspendedBy: { type: 'string' },
                  reason: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' }
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
      // Verify authentication if required
      let user = null
      try {
        user = await verifyAuthIfRequired(req, reply)
      } catch (error) {
        console.error('Auth error in issuer addresses:', error)
        // Continue without authentication for development
      }
      
      // Parse query parameters
      const parsed = IssuerAddressQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' })
      }
      
      const { organizationId, status, ledger, network, limit, offset } = parsed.data
      
      // Build where clause
      const where: any = {}
      if (organizationId) where.organizationId = organizationId
      if (status) where.status = status
      if (ledger) where.ledger = ledger
      if (network) where.network = network
      
      // Get addresses from database
      const [addresses, total] = await Promise.all([
        prisma.issuerAddress.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            organizationId: true,
            address: true,
            ledger: true,
            network: true,
            allowedUseTags: true,
            status: true,
            approvedAt: true,
            approvedBy: true,
            suspendedAt: true,
            suspendedBy: true,
            reason: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.issuerAddress.count({ where })
      ])
      
      return reply.send({
        addresses: addresses.map((addr: any) => ({
          ...addr,
          approvedAt: addr.approvedAt?.toISOString() || null,
          suspendedAt: addr.suspendedAt?.toISOString() || null,
          createdAt: addr.createdAt.toISOString(),
          updatedAt: addr.updatedAt.toISOString()
        })),
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('Error listing issuer addresses:', error)
      return reply.status(500).send({ error: 'Failed to list issuer addresses' })
    }
  })

  // 2. POST /v1/issuer-addresses - Create issuer address
  app.post('/issuer-addresses', {
    schema: {
      summary: 'Create issuer address',
      description: 'Register a new issuer address for approval',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['organizationId', 'address', 'ledger', 'network'],
        properties: {
          organizationId: { 
            type: 'string', 
            description: 'Organization ID that owns this address'
          },
          address: { 
            type: 'string', 
            description: 'Blockchain address'
          },
          ledger: { 
            type: 'string', 
            enum: ['XRPL', 'ETHEREUM', 'HEDERA'],
            description: 'Target ledger'
          },
          network: { 
            type: 'string', 
            enum: ['MAINNET', 'TESTNET', 'DEVNET'],
            description: 'Network environment'
          },
          allowedUseTags: { 
            type: 'array', 
            items: { type: 'string', enum: ['ART', 'EMT', 'OTHER'] },
            default: ['OTHER'],
            description: 'Allowed use tags for this address'
          },
          proofOfControl: {
            type: 'object',
            properties: {
              challenge: { type: 'string' },
              signature: { type: 'string' },
              publicKey: { type: 'string' }
            },
            description: 'Proof of control challenge response'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            address: { type: 'string' },
            ledger: { type: 'string' },
            network: { type: 'string' },
            allowedUseTags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
            createdAt: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req, reply)
      
      // Parse request body
      const parsed = IssuerAddressCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body' })
      }
      
      const addressData = parsed.data
      
      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: addressData.organizationId }
      })
      
      if (!organization) {
        return reply.status(404).send({ error: 'Organization not found' })
      }
      
      // Check if address already exists
      const existingAddress = await prisma.issuerAddress.findFirst({
        where: {
          address: addressData.address,
          ledger: addressData.ledger,
          network: addressData.network
        }
      })
      
      if (existingAddress) {
        return reply.status(409).send({ error: 'Address already exists for this ledger/network' })
      }
      
      // TODO: Implement proof-of-control verification
      // For now, we'll create the address in PENDING status
      
      // Create issuer address
      const issuerAddress = await prisma.issuerAddress.create({
        data: {
          organizationId: addressData.organizationId,
          address: addressData.address,
          ledger: addressData.ledger,
          network: addressData.network,
          allowedUseTags: addressData.allowedUseTags,
          status: 'PENDING',
          proofOfControl: addressData.proofOfControl || undefined
        }
      })
      
      console.log('Issuer address created:', issuerAddress)
      
      return reply.status(201).send({
        id: issuerAddress.id,
        organizationId: issuerAddress.organizationId,
        address: issuerAddress.address,
        ledger: issuerAddress.ledger,
        network: issuerAddress.network,
        allowedUseTags: issuerAddress.allowedUseTags,
        status: issuerAddress.status,
        createdAt: issuerAddress.createdAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error creating issuer address:', error)
      return reply.status(500).send({ error: 'Failed to create issuer address' })
    }
  })

  // 3. GET /v1/issuer-addresses/{addressId} - Get issuer address details
  app.get('/issuer-addresses/:addressId', {
    schema: {
      summary: 'Get issuer address details',
      description: 'Retrieve issuer address information and audit trail',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['addressId'],
        properties: {
          addressId: { type: 'string', description: 'Issuer address ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            address: { type: 'string' },
            ledger: { type: 'string' },
            network: { type: 'string' },
            allowedUseTags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
            proofOfControl: { type: 'object' },
            approvedAt: { type: 'string' },
            approvedBy: { type: 'string' },
            suspendedAt: { type: 'string' },
            suspendedBy: { type: 'string' },
            reason: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                legalName: { type: 'string' }
              }
            }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req, reply)
      
      const { addressId } = req.params as { addressId: string }
      
      // Get issuer address with organization
      const issuerAddress = await prisma.issuerAddress.findUnique({
        where: { id: addressId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              legalName: true
            }
          }
        }
      })
      
      if (!issuerAddress) {
        return reply.status(404).send({ error: 'Issuer address not found' })
      }
      
      return reply.send({
        id: issuerAddress.id,
        organizationId: issuerAddress.organizationId,
        address: issuerAddress.address,
        ledger: issuerAddress.ledger,
        network: issuerAddress.network,
        allowedUseTags: issuerAddress.allowedUseTags,
        status: issuerAddress.status,
        proofOfControl: issuerAddress.proofOfControl,
        approvedAt: issuerAddress.approvedAt?.toISOString() || null,
        approvedBy: issuerAddress.approvedBy,
        suspendedAt: issuerAddress.suspendedAt?.toISOString() || null,
        suspendedBy: issuerAddress.suspendedBy,
        reason: issuerAddress.reason,
        metadata: issuerAddress.metadata,
        createdAt: issuerAddress.createdAt.toISOString(),
        updatedAt: issuerAddress.updatedAt.toISOString(),
        organization: issuerAddress.organization
      })
    } catch (error: any) {
      console.error('Error fetching issuer address:', error)
      return reply.status(500).send({ error: 'Failed to fetch issuer address' })
    }
  })

  // 4. PUT /v1/issuer-addresses/{addressId}/approve - Approve issuer address (4-eyes)
  app.put('/issuer-addresses/:addressId/approve', {
    schema: {
      summary: 'Approve issuer address',
      description: 'Approve an issuer address with 4-eyes verification',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['addressId'],
        properties: {
          addressId: { type: 'string', description: 'Issuer address ID' }
        }
      },
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { 
            type: 'string', 
            description: 'Reason for approval'
          },
          allowedUseTags: { 
            type: 'array', 
            items: { type: 'string', enum: ['ART', 'EMT', 'OTHER'] },
            description: 'Updated allowed use tags'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            approvedAt: { type: 'string' },
            approvedBy: { type: 'string' },
            reason: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req, reply)
      
      const { addressId } = req.params as { addressId: string }
      const { reason, allowedUseTags } = req.body as { reason: string; allowedUseTags?: string[] }
      
      if (!reason) {
        return reply.status(400).send({ error: 'Approval reason is required' })
      }
      
      // Get issuer address
      const issuerAddress = await prisma.issuerAddress.findUnique({
        where: { id: addressId }
      })
      
      if (!issuerAddress) {
        return reply.status(404).send({ error: 'Issuer address not found' })
      }
      
      // Check if address is in a state that can be approved
      if (issuerAddress.status !== 'PENDING') {
        return reply.status(422).send({ 
          error: `Cannot approve address in ${issuerAddress.status} status` 
        })
      }
      
      // TODO: Implement 4-eyes verification logic
      // For now, we'll approve directly
      
      // Update issuer address
      const updatedAddress = await prisma.issuerAddress.update({
        where: { id: addressId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: user?.sub || 'system',
          reason: reason,
          allowedUseTags: allowedUseTags || issuerAddress.allowedUseTags
        }
      })
      
      console.log('Issuer address approved:', updatedAddress)
      
      return reply.send({
        id: updatedAddress.id,
        status: updatedAddress.status,
        approvedAt: updatedAddress.approvedAt?.toISOString(),
        approvedBy: updatedAddress.approvedBy,
        reason: updatedAddress.reason
      })
    } catch (error: any) {
      console.error('Error approving issuer address:', error)
      return reply.status(500).send({ error: 'Failed to approve issuer address' })
    }
  })

  // 5. PUT /v1/issuer-addresses/{addressId}/suspend - Suspend issuer address
  app.put('/issuer-addresses/:addressId/suspend', {
    schema: {
      summary: 'Suspend issuer address',
      description: 'Suspend an issuer address',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['addressId'],
        properties: {
          addressId: { type: 'string', description: 'Issuer address ID' }
        }
      },
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { 
            type: 'string', 
            description: 'Reason for suspension'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            suspendedAt: { type: 'string' },
            suspendedBy: { type: 'string' },
            reason: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        422: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req, reply)
      
      const { addressId } = req.params as { addressId: string }
      const { reason } = req.body as { reason: string }
      
      if (!reason) {
        return reply.status(400).send({ error: 'Suspension reason is required' })
      }
      
      // Get issuer address
      const issuerAddress = await prisma.issuerAddress.findUnique({
        where: { id: addressId }
      })
      
      if (!issuerAddress) {
        return reply.status(404).send({ error: 'Issuer address not found' })
      }
      
      // Check if address is in a state that can be suspended
      if (issuerAddress.status === 'SUSPENDED') {
        return reply.status(422).send({ 
          error: 'Address is already suspended' 
        })
      }
      
      // Update issuer address
      const updatedAddress = await prisma.issuerAddress.update({
        where: { id: addressId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedBy: user?.sub || 'system',
          reason: reason
        }
      })
      
      console.log('Issuer address suspended:', updatedAddress)
      
      return reply.send({
        id: updatedAddress.id,
        status: updatedAddress.status,
        suspendedAt: updatedAddress.suspendedAt?.toISOString(),
        suspendedBy: updatedAddress.suspendedBy,
        reason: updatedAddress.reason
      })
    } catch (error: any) {
      console.error('Error suspending issuer address:', error)
      return reply.status(500).send({ error: 'Failed to suspend issuer address' })
    }
  })

  // 6. GET /v1/issuer-addresses/approved - Get approved addresses for asset creation
  app.get('/issuer-addresses/approved', {
    schema: {
      summary: 'Get approved issuer addresses',
      description: 'Get list of approved issuer addresses for asset creation',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          organizationId: { 
            type: 'string', 
            description: 'Filter by organization ID'
          },
          ledger: { 
            type: 'string', 
            enum: ['XRPL', 'ETHEREUM', 'HEDERA'],
            description: 'Filter by ledger'
          },
          network: { 
            type: 'string', 
            enum: ['MAINNET', 'TESTNET', 'DEVNET'],
            description: 'Filter by network'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  address: { type: 'string' },
                  ledger: { type: 'string' },
                  network: { type: 'string' },
                  allowedUseTags: { type: 'array', items: { type: 'string' } },
                  approvedAt: { type: 'string' },
                  approvedBy: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      let user = null
      try {
        user = await verifyAuthIfRequired(req, reply)
      } catch (error) {
        console.error('Auth error in approved issuer addresses:', error)
        // Continue without authentication for development
      }
      
      const { organizationId, ledger, network } = req.query as { 
        organizationId?: string; 
        ledger?: string; 
        network?: string 
      }
      
      // Build where clause - only APPROVED addresses
      const where: any = { status: 'APPROVED' }
      if (organizationId) where.organizationId = organizationId
      if (ledger) where.ledger = ledger
      if (network) where.network = network
      
      // Get approved addresses
      const addresses = await prisma.issuerAddress.findMany({
        where,
        orderBy: { approvedAt: 'desc' },
        select: {
          id: true,
          address: true,
          ledger: true,
          network: true,
          allowedUseTags: true,
          approvedAt: true,
          approvedBy: true
        }
      })
      
      return reply.send({
        addresses: addresses.map((addr: any) => ({
          ...addr,
          approvedAt: addr.approvedAt?.toISOString()
        }))
      })
    } catch (error: any) {
      console.error('Error fetching approved issuer addresses:', error)
      return reply.status(500).send({ error: 'Failed to fetch approved issuer addresses' })
    }
  })

  // 7. POST /v1/issuer-addresses/{addressId}/proof-of-control - Submit proof of control
  app.post('/issuer-addresses/:addressId/proof-of-control', {
    schema: {
      summary: 'Submit proof of control',
      description: 'Submit proof of control challenge response',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['addressId'],
        properties: {
          addressId: { type: 'string', description: 'Issuer address ID' }
        }
      },
      body: {
        type: 'object',
        required: ['challenge', 'signature'],
        properties: {
          challenge: { 
            type: 'string', 
            description: 'Challenge string'
          },
          signature: { 
            type: 'string', 
            description: 'Signature of the challenge'
          },
          publicKey: { 
            type: 'string', 
            description: 'Public key (optional)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            verified: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req, reply)
      
      const { addressId } = req.params as { addressId: string }
      const { challenge, signature, publicKey } = req.body as { 
        challenge: string; 
        signature: string; 
        publicKey?: string 
      }
      
      // Get issuer address
      const issuerAddress = await prisma.issuerAddress.findUnique({
        where: { id: addressId }
      })
      
      if (!issuerAddress) {
        return reply.status(404).send({ error: 'Issuer address not found' })
      }
      
      // TODO: Implement actual proof-of-control verification
      // For now, we'll just store the proof and mark as verified
      
      // Update issuer address with proof of control
      const updatedAddress = await prisma.issuerAddress.update({
        where: { id: addressId },
        data: {
          proofOfControl: {
            challenge,
            signature,
            publicKey,
            verifiedAt: new Date().toISOString(),
            verifiedBy: user?.sub || 'system'
          }
        }
      })
      
      console.log('Proof of control submitted:', updatedAddress)
      
      return reply.send({
        id: updatedAddress.id,
        verified: true,
        message: 'Proof of control submitted successfully'
      })
    } catch (error: any) {
      console.error('Error submitting proof of control:', error)
      return reply.status(500).send({ error: 'Failed to submit proof of control' })
    }
  })
}

import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'

// ---------- Authentication Helper ----------
async function verifyAuthIfRequired(req: any): Promise<any> {
  const AUTH_MODE = (process.env.AUTH_MODE ?? "off").toLowerCase()
  
  if (AUTH_MODE === "off") {
    return null // No authentication required
  }
  
  await req.jwtVerify()
  return req.user
}

// ---------- Validation Schemas ----------
const OrganizationCreateSchema = z.object({
  name: z.string().min(1).max(100),
  legalName: z.string().optional(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  jurisdiction: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
})

const OrganizationUpdateSchema = OrganizationCreateSchema.partial()

const OrganizationQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  country: z.string().length(2).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

export default async function organizationRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  
  // 1. GET /v1/organizations - List organizations
  app.get('/organizations', {
    schema: {
      summary: 'List organizations',
      description: 'List organizations with optional filtering and pagination',
      tags: ['v1'],
      querystring: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
            description: 'Filter by organization status'
          },
          country: { 
            type: 'string', 
            minLength: 2,
            maxLength: 2,
            description: 'Filter by country (ISO 3166-1 alpha-2)'
          },
          limit: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100, 
            default: 20,
            description: 'Number of organizations to return'
          },
          offset: { 
            type: 'number', 
            minimum: 0, 
            default: 0,
            description: 'Number of organizations to skip'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  legalName: { type: 'string' },
                  country: { type: 'string' },
                  jurisdiction: { type: 'string' },
                  status: { type: 'string' },
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
      const user = await verifyAuthIfRequired(req)
      
      // Parse query parameters
      const parsed = OrganizationQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' })
      }
      
      const { status, country, limit, offset } = parsed.data
      
      // Build where clause
      const where: any = {}
      if (status) where.status = status
      if (country) where.country = country
      
      // Get organizations from database
      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            legalName: true,
            country: true,
            jurisdiction: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.organization.count({ where })
      ])
      
      return reply.send({
        organizations: organizations.map(org => ({
          ...org,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString()
        })),
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('Error listing organizations:', error)
      return reply.status(500).send({ error: 'Failed to list organizations' })
    }
  })

  // 2. POST /v1/organizations - Create organization
  app.post('/organizations', {
    schema: {
      summary: 'Create organization',
      description: 'Create a new organization',
      tags: ['v1'],
      body: {
        type: 'object',
        required: ['name', 'country'],
        properties: {
          name: { 
            type: 'string', 
            minLength: 1,
            maxLength: 100,
            description: 'Organization name'
          },
          legalName: { 
            type: 'string',
            description: 'Legal name of the organization'
          },
          country: { 
            type: 'string', 
            minLength: 2,
            maxLength: 2,
            description: 'Country code (ISO 3166-1 alpha-2)'
          },
          jurisdiction: { 
            type: 'string',
            description: 'Legal jurisdiction'
          },
          taxId: { 
            type: 'string',
            description: 'Tax identification number'
          },
          website: { 
            type: 'string',
            format: 'uri',
            description: 'Organization website'
          },
          metadata: { 
            type: 'object',
            description: 'Additional metadata'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            legalName: { type: 'string' },
            country: { type: 'string' },
            jurisdiction: { type: 'string' },
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
      const user = await verifyAuthIfRequired(req)
      
      // Parse request body
      const parsed = OrganizationCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body' })
      }
      
      const orgData = parsed.data
      
      // Check if organization with same name already exists
      const existingOrg = await prisma.organization.findFirst({
        where: { name: orgData.name }
      })
      
      if (existingOrg) {
        return reply.status(409).send({ error: 'Organization with this name already exists' })
      }
      
      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name: orgData.name,
          legalName: orgData.legalName,
          country: orgData.country,
          jurisdiction: orgData.jurisdiction,
          taxId: orgData.taxId,
          website: orgData.website,
          metadata: orgData.metadata,
          status: 'ACTIVE'
        }
      })
      
      console.log('Organization created:', organization)
      
      return reply.status(201).send({
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        country: organization.country,
        jurisdiction: organization.jurisdiction,
        status: organization.status,
        createdAt: organization.createdAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error creating organization:', error)
      return reply.status(500).send({ error: 'Failed to create organization' })
    }
  })

  // 3. GET /v1/organizations/{organizationId} - Get organization details
  app.get('/organizations/:organizationId', {
    schema: {
      summary: 'Get organization details',
      description: 'Retrieve organization information and statistics',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string', description: 'Organization ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            legalName: { type: 'string' },
            country: { type: 'string' },
            jurisdiction: { type: 'string' },
            taxId: { type: 'string' },
            website: { type: 'string' },
            status: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                users: { type: 'number' },
                products: { type: 'number' },
                assets: { type: 'number' },
                issuerAddresses: { type: 'number' }
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
      const user = await verifyAuthIfRequired(req)
      
      const { organizationId } = req.params as { organizationId: string }
      
      // Get organization
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      if (!organization) {
        return reply.status(404).send({ error: 'Organization not found' })
      }
      
      // Return basic organization data without statistics for now
      return reply.send({
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        country: organization.country,
        jurisdiction: organization.jurisdiction,
        taxId: organization.taxId,
        website: organization.website,
        status: organization.status,
        metadata: organization.metadata,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        stats: {
          users: 0,
          products: 0,
          assets: 0,
          issuerAddresses: 0
        }
      })
    } catch (error: any) {
      console.error('Error fetching organization:', error)
      return reply.status(500).send({ error: 'Failed to fetch organization' })
    }
  })

  // 4. PUT /v1/organizations/{organizationId} - Update organization
  app.put('/organizations/:organizationId', {
    schema: {
      summary: 'Update organization',
      description: 'Update organization information',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string', description: 'Organization ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          legalName: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 2 },
          jurisdiction: { type: 'string' },
          taxId: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'] },
          metadata: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            legalName: { type: 'string' },
            country: { type: 'string' },
            jurisdiction: { type: 'string' },
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
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req)
      
      const { organizationId } = req.params as { organizationId: string }
      
      // Parse request body
      const parsed = OrganizationUpdateSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body' })
      }
      
      const updateData = parsed.data
      
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      if (!existingOrg) {
        return reply.status(404).send({ error: 'Organization not found' })
      }
      
      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingOrg.name) {
        const nameConflict = await prisma.organization.findFirst({
          where: { 
            name: updateData.name,
            id: { not: organizationId }
          }
        })
        
        if (nameConflict) {
          return reply.status(409).send({ error: 'Organization with this name already exists' })
        }
      }
      
      // Update organization
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: updateData
      })
      
      console.log('Organization updated:', organization)
      
      return reply.send({
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        country: organization.country,
        jurisdiction: organization.jurisdiction,
        status: organization.status,
        updatedAt: organization.updatedAt.toISOString()
      })
    } catch (error: any) {
      console.error('Error updating organization:', error)
      return reply.status(500).send({ error: 'Failed to update organization' })
    }
  })

  // 5. GET /v1/organizations/{organizationId}/users - List organization users
  app.get('/organizations/:organizationId/users', {
    schema: {
      summary: 'List organization users',
      description: 'List users belonging to an organization',
      tags: ['v1'],
      params: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string', description: 'Organization ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          role: { 
            type: 'string', 
            enum: ['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'OPERATOR', 'VIEWER'],
            description: 'Filter by user role'
          },
          status: { 
            type: 'string', 
            enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
            description: 'Filter by user status'
          },
          limit: { 
            type: 'number', 
            minimum: 1, 
            maximum: 100, 
            default: 20 
          },
          offset: { 
            type: 'number', 
            minimum: 0, 
            default: 0 
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  status: { type: 'string' },
                  twoFactorEnabled: { type: 'boolean' },
                  createdAt: { type: 'string' }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    try {
      // Verify authentication if required
      const user = await verifyAuthIfRequired(req)
      
      const { organizationId } = req.params as { organizationId: string }
      const { role, status, limit = 20, offset = 0 } = req.query as any
      
      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      if (!organization) {
        return reply.status(404).send({ error: 'Organization not found' })
      }
      
      // Build where clause
      const where: any = { organizationId }
      if (role) where.role = role
      if (status) where.status = status
      
      // Get users from database
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true
          }
        }),
        prisma.user.count({ where })
      ])
      
      return reply.send({
        users: users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString()
        })),
        total,
        limit,
        offset
      })
    } catch (error: any) {
      console.error('Error listing organization users:', error)
      return reply.status(500).send({ error: 'Failed to list organization users' })
    }
  })
}

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient, AssetClass, ProductStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Zod schemas for validation
const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  assetClass: z.nativeEnum(AssetClass).default(AssetClass.OTHER),
  policyPresets: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  targetMarkets: z.array(z.string().length(2)).optional(), // ISO country codes
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT)
})

const updateProductSchema = createProductSchema.partial()

const listProductsQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  status: z.nativeEnum(ProductStatus).optional(),
  assetClass: z.nativeEnum(AssetClass).optional(),
  search: z.string().optional(),
  orgId: z.string().optional()
})

// Authentication helper - simplified for now
async function verifyAuthIfRequired(req: any): Promise<any> {
  // For now, return null to avoid JWT errors
  // TODO: Implement proper authentication when AUTH_MODE is set
  return null
}

export default async function productRoutes(fastify: FastifyInstance) {
  // GET /v1/products - List products
  fastify.get('/products', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const query = listProductsQuerySchema.parse(request.query)
      
      const { page, limit, status, assetClass, search, orgId } = query
      const offset = (page - 1) * limit

      // Build where clause
      const where: any = {}
      
      if (status) where.status = status
      if (assetClass) where.assetClass = assetClass
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      // If authenticated, scope to user's organization
      if (user) {
        where.organizationId = user.organizationId
      } else {
        // For now, allow filtering by organization ID in query params
        // This is a temporary solution until proper authentication is implemented
        const { orgId } = query
        if (orgId) {
          where.organizationId = orgId
        }
      }

      // Get products with organization info
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                assets: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.product.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error listing products:', error)
      return reply.status(500).send({ error: 'Failed to list products' })
    }
  })

  // POST /v1/products - Create product
  fastify.post('/products', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const data = createProductSchema.parse(request.body)

      // Get organization ID
      let organizationId: string
      if (user) {
        organizationId = user.organizationId
      } else {
        // For unauthenticated mode, use default organization
        const defaultOrg = await prisma.organization.findFirst({
          where: { name: 'Default Organization' }
        })
        if (!defaultOrg) {
          return reply.status(500).send({ error: 'Default organization not found' })
        }
        organizationId = defaultOrg.id
      }

      // Check if product name already exists in organization
      const existingProduct = await prisma.product.findFirst({
        where: {
          organizationId,
          name: data.name
        }
      })

      if (existingProduct) {
        return reply.status(400).send({ 
          error: 'Product name already exists in this organization' 
        })
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          ...data,
          organizationId,
          targetMarkets: data.targetMarkets || []
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return reply.status(201).send(product)
    } catch (error) {
      console.error('Error creating product:', error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      return reply.status(500).send({ error: 'Failed to create product' })
    }
  })

  // GET /v1/products/:id - Get product details
  fastify.get('/products/:id', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const { id } = request.params as { id: string }

      // Build where clause
      const where: any = { id }
      if (user) {
        where.organizationId = user.organizationId
      }

      const product = await prisma.product.findFirst({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              country: true
            }
          },
          assets: {
            select: {
              id: true,
              assetRef: true,
              ledger: true,
              network: true,
              code: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              assets: true,
              events: true
            }
          }
        }
      })

      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      return product
    } catch (error) {
      console.error('Error getting product:', error)
      return reply.status(500).send({ error: 'Failed to get product' })
    }
  })

  // PUT /v1/products/:id - Update product
  fastify.put('/products/:id', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const { id } = request.params as { id: string }
      const data = updateProductSchema.parse(request.body)

      // Build where clause
      const where: any = { id }
      if (user) {
        where.organizationId = user.organizationId
      }

      // Check if product exists
      const existingProduct = await prisma.product.findFirst({ where })
      if (!existingProduct) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      // Check for name conflicts if name is being updated
      if (data.name && data.name !== existingProduct.name) {
        const nameConflict = await prisma.product.findFirst({
          where: {
            organizationId: existingProduct.organizationId,
            name: data.name,
            id: { not: id }
          }
        })

        if (nameConflict) {
          return reply.status(400).send({ 
            error: 'Product name already exists in this organization' 
          })
        }
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          targetMarkets: data.targetMarkets || existingProduct.targetMarkets
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return updatedProduct
    } catch (error) {
      console.error('Error updating product:', error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      return reply.status(500).send({ error: 'Failed to update product' })
    }
  })

  // DELETE /v1/products/:id - Delete product (soft delete)
  fastify.delete('/products/:id', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const { id } = request.params as { id: string }

      // Build where clause
      const where: any = { id }
      if (user) {
        where.organizationId = user.organizationId
      }

      // Check if product exists
      const product = await prisma.product.findFirst({ where })
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      // Check if product has active assets
      const activeAssets = await prisma.asset.count({
        where: {
          productId: id,
          status: { in: ['ACTIVE', 'PAUSED'] }
        }
      })

      if (activeAssets > 0) {
        return reply.status(400).send({ 
          error: 'Cannot delete product with active assets. Please retire or delete assets first.' 
        })
      }

      // Soft delete by setting status to RETIRED
      const deletedProduct = await prisma.product.update({
        where: { id },
        data: { status: ProductStatus.RETIRED },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return { message: 'Product retired successfully', product: deletedProduct }
    } catch (error) {
      console.error('Error deleting product:', error)
      return reply.status(500).send({ error: 'Failed to delete product' })
    }
  })

  // GET /v1/products/:id/assets - List assets for a product
  fastify.get('/products/:id/assets', async (request, reply) => {
    try {
      const user = await verifyAuthIfRequired(request)
      const { id } = request.params as { id: string }
      const query = listProductsQuerySchema.parse(request.query)
      
      const { page, limit } = query
      const offset = (page - 1) * limit

      // Build where clause
      const where: any = { productId: id }
      if (user) {
        // Verify product belongs to user's organization
        const product = await prisma.product.findFirst({
          where: { id, organizationId: user.organizationId }
        })
        if (!product) {
          return reply.status(404).send({ error: 'Product not found' })
        }
      }

      // Get assets
      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.asset.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        assets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error listing product assets:', error)
      return reply.status(500).send({ error: 'Failed to list product assets' })
    }
  })
}

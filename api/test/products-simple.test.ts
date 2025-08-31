import { PrismaClient, AssetClass, ProductStatus } from '@prisma/client'

const prisma = new PrismaClient()

describe('Product API - Simple Tests', () => {
  let testOrg: any

  beforeAll(async () => {
    // Get or create test organization
    testOrg = await prisma.organization.findFirst({
      where: { name: 'Default Organization' }
    })
    
    if (!testOrg) {
      // Create default organization if it doesn't exist
      testOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          legalName: 'Default Organization',
          country: 'US',
          jurisdiction: 'US',
          status: 'ACTIVE'
        }
      })
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up products before each test
    await prisma.product.deleteMany()
  })

  describe('Product CRUD Operations', () => {
    it('should create a product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        assetClass: AssetClass.ART,
        targetMarkets: ['US', 'EU'],
        status: ProductStatus.DRAFT
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          organizationId: testOrg.id
        }
      })

      expect(product.name).toBe(productData.name)
      expect(product.assetClass).toBe(productData.assetClass)
      expect(product.organizationId).toBe(testOrg.id)
      expect(product.targetMarkets).toEqual(['US', 'EU'])
    })

    it('should list products', async () => {
      // Create test products
      await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Product 1',
          assetClass: AssetClass.ART
        }
      })

      await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Product 2',
          assetClass: AssetClass.EMT
        }
      })

      const products = await prisma.product.findMany({
        where: { organizationId: testOrg.id }
      })

      expect(products).toHaveLength(2)
      expect(products[0].name).toBe('Product 1')
      expect(products[1].name).toBe('Product 2')
    })

    it('should update a product', async () => {
      const product = await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Original Name',
          assetClass: AssetClass.OTHER
        }
      })

      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: 'Updated Name',
          status: ProductStatus.ACTIVE
        }
      })

      expect(updatedProduct.name).toBe('Updated Name')
      expect(updatedProduct.status).toBe(ProductStatus.ACTIVE)
    })

    it('should soft delete a product', async () => {
      const product = await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Product to Delete',
          assetClass: AssetClass.OTHER
        }
      })

      // Soft delete by setting status to RETIRED
      const deletedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.RETIRED }
      })

      expect(deletedProduct.status).toBe(ProductStatus.RETIRED)

      // Verify product still exists but is retired
      const existingProduct = await prisma.product.findUnique({
        where: { id: product.id }
      })
      expect(existingProduct?.status).toBe(ProductStatus.RETIRED)
    })
  })

  describe('Product Validation', () => {
    it('should enforce unique product names within organization', async () => {
      await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Duplicate Name',
          assetClass: AssetClass.OTHER
        }
      })

      // Try to create another product with the same name
      await expect(
        prisma.product.create({
          data: {
            organizationId: testOrg.id,
            name: 'Duplicate Name',
            assetClass: AssetClass.OTHER
          }
        })
      ).rejects.toThrow()
    })

    it('should allow same product names in different organizations', async () => {
      // Create another organization
      const org2 = await prisma.organization.create({
        data: {
          name: 'Test Org 2',
          country: 'US',
          status: 'ACTIVE'
        }
      })

      // Create products with same name in different organizations
      await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Same Name',
          assetClass: AssetClass.OTHER
        }
      })

      await prisma.product.create({
        data: {
          organizationId: org2.id,
          name: 'Same Name',
          assetClass: AssetClass.OTHER
        }
      })

      const products = await prisma.product.findMany({
        where: { name: 'Same Name' }
      })

      expect(products).toHaveLength(2)
      expect(products[0].organizationId).not.toBe(products[1].organizationId)
    })
  })

  describe('Product Relationships', () => {
    it('should link products to organizations', async () => {
      const product = await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Product',
          assetClass: AssetClass.ART
        },
        include: {
          organization: true
        }
      })

      expect(product.organization.id).toBe(testOrg.id)
      expect(product.organization.name).toBe('Default Organization')
    })

    it('should count assets for products', async () => {
      const product = await prisma.product.create({
        data: {
          organizationId: testOrg.id,
          name: 'Product with Assets',
          assetClass: AssetClass.OTHER
        }
      })

      // Create assets for this product
      await prisma.asset.create({
        data: {
          productId: product.id,
          assetRef: 'ASSET1',
          ledger: 'XRPL',
          network: 'TESTNET',
          code: 'TEST1',
          decimals: 6
        }
      })

      await prisma.asset.create({
        data: {
          productId: product.id,
          assetRef: 'ASSET2',
          ledger: 'ETHEREUM',
          network: 'TESTNET',
          code: 'TEST2',
          decimals: 18
        }
      })

      const productWithCount = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          _count: {
            select: {
              assets: true
            }
          }
        }
      })

      expect(productWithCount?._count.assets).toBe(2)
    })
  })
})

import { PrismaClient, AssetClass, ProductStatus } from '@prisma/client'
import { createTestApp } from '../../utils/appFactory'
import { TestDataManager, testProducts, ApiTestHelper } from '../../utils/testHelpers'

const prisma = new PrismaClient()

describe('Product Management API', () => {
  let app: any
  let testOrg: any
  let testUser: any

  beforeAll(async () => {
    app = await createTestApp()
    
    // Create test organization and user
    testOrg = await TestDataManager.createTestOrganization({
      name: 'Test Product Org',
      country: 'US',
      status: 'ACTIVE'
    })
    
    testUser = await TestDataManager.createTestUser(testOrg.id, {
      email: 'product-test@example.com',
      role: 'ADMIN'
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up products before each test
    await prisma.product.deleteMany()
  })

  describe('GET /v1/products', () => {
    it('should list products with pagination', async () => {
      // Create test products
      const product1 = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Test Product 1',
        assetClass: AssetClass.OTHER,
        status: ProductStatus.DRAFT
      })

      const product2 = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Test Product 2',
        assetClass: AssetClass.ART,
        status: ProductStatus.ACTIVE
      })

      const response = await ApiTestHelper.makeAuthenticatedRequest(app, 'get', '/v1/products')

      expect(response.body.products).toHaveLength(2)
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      })
    })

    it('should filter products by status', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Draft Product',
        status: ProductStatus.DRAFT
      })

      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Active Product',
        status: ProductStatus.ACTIVE
      })

      const response = await request(app)
        .get('/v1/products?status=ACTIVE')
        .expect(200)

      expect(response.body.products).toHaveLength(1)
      expect(response.body.products[0].name).toBe('Active Product')
    })

    it('should filter products by asset class', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'ART Product',
        assetClass: AssetClass.ART
      })

      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'EMT Product',
        assetClass: AssetClass.EMT
      })

      const response = await request(app)
        .get('/v1/products?assetClass=ART')
        .expect(200)

      expect(response.body.products).toHaveLength(1)
      expect(response.body.products[0].name).toBe('ART Product')
    })

    it('should search products by name', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'EUR Stablecoin',
        description: 'Euro stablecoin product'
      })

      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'USD Stablecoin',
        description: 'US Dollar stablecoin product'
      })

      const response = await request(app)
        .get('/v1/products?search=EUR')
        .expect(200)

      expect(response.body.products).toHaveLength(1)
      expect(response.body.products[0].name).toBe('EUR Stablecoin')
    })

    it('should handle pagination correctly', async () => {
      // Create 15 products
      for (let i = 1; i <= 15; i++) {
        await TestDataManager.createTestProduct(testOrg.id, {
          name: `Product ${i}`,
          assetClass: AssetClass.OTHER
        })
      }

      const response = await request(app)
        .get('/v1/products?page=2&limit=5')
        .expect(200)

      expect(response.body.products).toHaveLength(5)
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      })
    })
  })

  describe('POST /v1/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = testProducts.valid

      const response = await request(app)
        .post('/v1/products')
        .send(productData)
        .expect(201)

      expect(response.body.name).toBe(productData.name)
      expect(response.body.assetClass).toBe(productData.assetClass)
      expect(response.body.organization.name).toBe('Default Organization')
      expect(response.body.targetMarkets).toEqual(['US', 'EU'])
      expect(response.body.status).toBe(ProductStatus.DRAFT)
    })

    it('should create a product with minimal data', async () => {
      const productData = testProducts.minimal

      const response = await request(app)
        .post('/v1/products')
        .send(productData)
        .expect(201)

      expect(response.body.name).toBe(productData.name)
      expect(response.body.assetClass).toBe(productData.assetClass)
      expect(response.body.status).toBe(ProductStatus.DRAFT)
      expect(response.body.targetMarkets).toEqual([])
    })

    it('should reject duplicate product names in same organization', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Duplicate Product',
        assetClass: AssetClass.OTHER
      })

      const response = await request(app)
        .post('/v1/products')
        .send({
          name: 'Duplicate Product',
          assetClass: AssetClass.OTHER
        })
        .expect(400)

      expect(response.body.error).toContain('Product name already exists')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/products')
        .send({})
        .expect(400)

      expect(response.body.error).toBe('Validation error')
      expect(response.body.details).toBeDefined()
    })

    it('should validate asset class enum', async () => {
      const response = await request(app)
        .post('/v1/products')
        .send({
          name: 'Invalid Product',
          assetClass: 'INVALID'
        })
        .expect(400)

      expect(response.body.error).toBe('Validation error')
    })

    it('should validate name length constraints', async () => {
      const longName = 'a'.repeat(101) // Exceeds 100 character limit
      
      const response = await request(app)
        .post('/v1/products')
        .send({
          name: longName,
          assetClass: AssetClass.OTHER
        })
        .expect(400)

      expect(response.body.error).toBe('Validation error')
    })

    it('should validate target markets format', async () => {
      const response = await request(app)
        .post('/v1/products')
        .send({
          name: 'Test Product',
          assetClass: AssetClass.OTHER,
          targetMarkets: ['INVALID'] // Should be 2-letter country codes
        })
        .expect(400)

      expect(response.body.error).toBe('Validation error')
    })
  })

  describe('GET /v1/products/:id', () => {
    it('should get product details with assets', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Test Product',
        assetClass: AssetClass.ART
      })

      const response = await request(app)
        .get(`/v1/products/${product.id}`)
        .expect(200)

      expect(response.body.id).toBe(product.id)
      expect(response.body.name).toBe('Test Product')
      expect(response.body.organization).toBeDefined()
      expect(response.body.assets).toBeDefined()
      expect(response.body._count).toBeDefined()
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/v1/products/non-existent-id')
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })

    it('should include asset count in response', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product with Assets',
        assetClass: AssetClass.OTHER
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

      const response = await request(app)
        .get(`/v1/products/${product.id}`)
        .expect(200)

      expect(response.body._count.assets).toBe(1)
    })
  })

  describe('PUT /v1/products/:id', () => {
    it('should update product with valid data', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Original Name',
        assetClass: AssetClass.OTHER
      })

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: ProductStatus.ACTIVE
      }

      const response = await request(app)
        .put(`/v1/products/${product.id}`)
        .send(updateData)
        .expect(200)

      expect(response.body.name).toBe('Updated Name')
      expect(response.body.description).toBe('Updated description')
      expect(response.body.status).toBe(ProductStatus.ACTIVE)
    })

    it('should reject duplicate names on update', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Existing Product',
        assetClass: AssetClass.OTHER
      })

      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product to Update',
        assetClass: AssetClass.OTHER
      })

      const response = await request(app)
        .put(`/v1/products/${product.id}`)
        .send({ name: 'Existing Product' })
        .expect(400)

      expect(response.body.error).toContain('Product name already exists')
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .put('/v1/products/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })

    it('should validate update data', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Test Product',
        assetClass: AssetClass.OTHER
      })

      const response = await request(app)
        .put(`/v1/products/${product.id}`)
        .send({ assetClass: 'INVALID' })
        .expect(400)

      expect(response.body.error).toBe('Validation error')
    })
  })

  describe('DELETE /v1/products/:id', () => {
    it('should soft delete product by setting status to RETIRED', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product to Delete',
        assetClass: AssetClass.OTHER
      })

      const response = await request(app)
        .delete(`/v1/products/${product.id}`)
        .expect(200)

      expect(response.body.message).toBe('Product retired successfully')
      expect(response.body.product.status).toBe(ProductStatus.RETIRED)

      // Verify product still exists but is retired
      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id }
      })
      expect(deletedProduct?.status).toBe(ProductStatus.RETIRED)
    })

    it('should reject deletion of product with active assets', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product with Assets',
        assetClass: AssetClass.OTHER
      })

      // Create an active asset for this product
      await prisma.asset.create({
        data: {
          productId: product.id,
          assetRef: 'TEST123',
          ledger: 'XRPL',
          network: 'TESTNET',
          code: 'TEST',
          decimals: 6,
          status: 'ACTIVE'
        }
      })

      const response = await request(app)
        .delete(`/v1/products/${product.id}`)
        .expect(400)

      expect(response.body.error).toContain('Cannot delete product with active assets')
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .delete('/v1/products/non-existent-id')
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })
  })

  describe('GET /v1/products/:id/assets', () => {
    it('should list assets for a product', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product with Assets',
        assetClass: AssetClass.OTHER
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

      const response = await request(app)
        .get(`/v1/products/${product.id}/assets`)
        .expect(200)

      expect(response.body.assets).toHaveLength(2)
      expect(response.body.pagination.total).toBe(2)
      expect(response.body.assets[0].product.id).toBe(product.id)
    })

    it('should return empty list for product without assets', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product without Assets',
        assetClass: AssetClass.OTHER
      })

      const response = await request(app)
        .get(`/v1/products/${product.id}/assets`)
        .expect(200)

      expect(response.body.assets).toHaveLength(0)
      expect(response.body.pagination.total).toBe(0)
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/v1/products/non-existent-id/assets')
        .expect(404)

      expect(response.body.error).toBe('Product not found')
    })

    it('should handle pagination for assets', async () => {
      const product = await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Product with Many Assets',
        assetClass: AssetClass.OTHER
      })

      // Create 15 assets
      for (let i = 1; i <= 15; i++) {
        await prisma.asset.create({
          data: {
            productId: product.id,
            assetRef: `ASSET${i}`,
            ledger: 'XRPL',
            network: 'TESTNET',
            code: `TEST${i}`,
            decimals: 6
          }
        })
      }

      const response = await request(app)
        .get(`/v1/products/${product.id}/assets?page=2&limit=5`)
        .expect(200)

      expect(response.body.assets).toHaveLength(5)
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      })
    })
  })

  describe('Database Constraints', () => {
    it('should enforce unique product names within organization at database level', async () => {
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Unique Name Test',
        assetClass: AssetClass.OTHER
      })

      // Try to create another product with the same name in the same organization
      await expect(
        TestDataManager.createTestProduct(testOrg.id, {
          name: 'Unique Name Test',
          assetClass: AssetClass.OTHER
        })
      ).rejects.toThrow()
    })

    it('should allow same product names in different organizations', async () => {
      // Create another organization
      const org2 = await TestDataManager.createTestOrganization({
        name: 'Test Org 2',
        country: 'US'
      })

      // Create products with same name in different organizations
      await TestDataManager.createTestProduct(testOrg.id, {
        name: 'Same Name',
        assetClass: AssetClass.OTHER
      })

      await TestDataManager.createTestProduct(org2.id, {
        name: 'Same Name',
        assetClass: AssetClass.OTHER
      })

      const products = await prisma.product.findMany({
        where: { name: 'Same Name' }
      })

      expect(products).toHaveLength(2)
      expect(products[0].organizationId).not.toBe(products[1].organizationId)
    })

    it('should enforce name length constraints at database level', async () => {
      const longName = 'a'.repeat(101) // Exceeds 100 character limit
      
      await expect(
        TestDataManager.createTestProduct(testOrg.id, {
          name: longName,
          assetClass: AssetClass.OTHER
        })
      ).rejects.toThrow()
    })

    it('should enforce description length constraints at database level', async () => {
      const longDescription = 'a'.repeat(501) // Exceeds 500 character limit
      
      await expect(
        TestDataManager.createTestProduct(testOrg.id, {
          name: 'Test Product',
          description: longDescription,
          assetClass: AssetClass.OTHER
        })
      ).rejects.toThrow()
    })
  })
})

import { PrismaClient, OrganizationStatus, UserRole, UserStatus } from '@prisma/client'

describe('Organization Management - Database Tests', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.requirementInstance.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.product.deleteMany()
    await prisma.issuerAddress.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
  })

  describe('Organization CRUD Operations', () => {
    it('should create organization with valid data', async () => {
      const orgData = {
        name: 'Test Organization',
        legalName: 'Test Organization LLC',
        country: 'US',
        jurisdiction: 'United States',
        status: OrganizationStatus.ACTIVE,
        taxId: 'TEST123',
        website: 'https://test-org.com',
        metadata: { test: true }
      }

      const organization = await prisma.organization.create({
        data: orgData
      })

      expect(organization.name).toBe(orgData.name)
      expect(organization.country).toBe(orgData.country)
      expect(organization.status).toBe(OrganizationStatus.ACTIVE)
      expect(organization.id).toBeDefined()
      expect(organization.createdAt).toBeDefined()
    })

    it('should list organizations', async () => {
      // Create test organizations
      await prisma.organization.create({
        data: {
          name: 'Org 1',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      await prisma.organization.create({
        data: {
          name: 'Org 2',
          country: 'DE',
          status: OrganizationStatus.ACTIVE
        }
      })

      const organizations = await prisma.organization.findMany({
        orderBy: { createdAt: 'desc' }
      })

      expect(organizations).toHaveLength(2)
      expect(organizations.map(org => org.name)).toContain('Org 1')
      expect(organizations.map(org => org.name)).toContain('Org 2')
    })

    it('should filter organizations by country', async () => {
      await prisma.organization.create({
        data: {
          name: 'US Org',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      await prisma.organization.create({
        data: {
          name: 'DE Org',
          country: 'DE',
          status: OrganizationStatus.ACTIVE
        }
      })

      const usOrganizations = await prisma.organization.findMany({
        where: { country: 'US' }
      })

      expect(usOrganizations).toHaveLength(1)
      expect(usOrganizations[0].country).toBe('US')
    })

    it('should update organization', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Original Name',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      const updatedOrg = await prisma.organization.update({
        where: { id: org.id },
        data: { name: 'Updated Name' }
      })

      expect(updatedOrg.name).toBe('Updated Name')
      expect(updatedOrg.country).toBe('US') // Should remain unchanged
    })

    it('should prevent duplicate organization names', async () => {
      await prisma.organization.create({
        data: {
          name: 'Duplicate Name',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      // Try to create another organization with the same name
      await expect(
        prisma.organization.create({
          data: {
            name: 'Duplicate Name',
            country: 'DE',
            status: OrganizationStatus.ACTIVE
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Organization-User Relationships', () => {
    it('should associate users with organizations', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      const user = await prisma.user.create({
        data: {
          sub: 'test-user-1',
          email: 'user1@test.com',
          name: 'Test User 1',
          role: UserRole.VIEWER,
          status: UserStatus.ACTIVE,
          organizationId: org.id,
          twoFactorEnabled: false
        }
      })

      expect(user.organizationId).toBe(org.id)

      // Verify the relationship
      const orgWithUsers = await prisma.organization.findUnique({
        where: { id: org.id },
        include: { users: true }
      })

      expect(orgWithUsers?.users).toHaveLength(1)
      expect(orgWithUsers?.users[0].id).toBe(user.id)
    })

    it('should count users per organization', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          country: 'US',
          status: OrganizationStatus.ACTIVE
        }
      })

      await prisma.user.create({
        data: {
          sub: 'test-user-1',
          email: 'user1@test.com',
          name: 'User 1',
          role: UserRole.VIEWER,
          status: UserStatus.ACTIVE,
          organizationId: org.id,
          twoFactorEnabled: false
        }
      })

      await prisma.user.create({
        data: {
          sub: 'test-user-2',
          email: 'user2@test.com',
          name: 'User 2',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          organizationId: org.id,
          twoFactorEnabled: false
        }
      })

      const userCount = await prisma.user.count({
        where: { organizationId: org.id }
      })

      expect(userCount).toBe(2)
    })
  })

  describe('Data Validation', () => {
    it('should require organization name', async () => {
      await expect(
        prisma.organization.create({
          data: {
            name: '', // Empty name should fail
            country: 'US',
            status: OrganizationStatus.ACTIVE
          }
        })
      ).rejects.toThrow()
    })

    it('should require valid country code', async () => {
      await expect(
        prisma.organization.create({
          data: {
            name: 'Test Org',
            country: 'INVALID', // Invalid country code
            status: OrganizationStatus.ACTIVE
          }
        })
      ).rejects.toThrow()
    })
  })
})

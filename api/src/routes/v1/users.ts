import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireActiveTenant } from '../../middleware/tenantMiddleware.js'
import type { TenantRequest } from '../../middleware/tenantMiddleware.js'

const prisma = new PrismaClient()

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Get users with filtering and pagination
  app.get('/users', {
    preHandler: [requireActiveTenant],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          role: { 
            type: 'string', 
            enum: ['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'] 
          },
          status: { 
            type: 'string', 
            enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'] 
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { page = 1, limit = 20, search, role, status } = req.query as any
    const offset = (page - 1) * limit

    try {
      // Build where clause
      const where: any = {
        organizationId: req.tenant!.id
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (role) {
        where.role = role
      }

      if (status) {
        where.status = status
      }

      // Get users and total count
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.user.count({ where })
      ])

      const pages = Math.ceil(total / limit)

      return reply.send({
        users,
        total,
        page,
        limit,
        pages
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error fetching users')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch users'
      })
    }
  })

  // Get single user
  app.get('/users/:userId', {
    preHandler: [requireActiveTenant],
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { userId } = req.params as { userId: string }

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.tenant!.id
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          settings: {
            select: {
              timezone: true,
              language: true,
              theme: true
            }
          }
        }
      })

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        })
      }

      return reply.send(user)
    } catch (error) {
      app.log.error({ err: error }, 'Error fetching user')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user'
      })
    }
  })

  // Update user
  app.patch('/users/:userId', {
    preHandler: [requireActiveTenant],
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { 
            type: 'string', 
            enum: ['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'] 
          },
          status: { 
            type: 'string', 
            enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'] 
          }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { userId } = req.params as { userId: string }
    const updates = req.body as any

    try {
      // Check if user exists and belongs to organization
      const existingUser = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.tenant!.id
        }
      })

      if (!existingUser) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        })
      }

      // Prevent self-demotion from ADMIN role
      if (updates.role && updates.role !== 'ADMIN' && existingUser.id === req.user?.id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot change your own role from ADMIN'
        })
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Log the change
      await prisma.event.create({
        data: {
          type: 'USER_UPDATED',
          entityType: 'User',
          entityId: userId,
          organizationId: req.tenant!.id,
          userId: req.user?.id,
          metadata: {
            changes: updates,
            previousRole: existingUser.role,
            newRole: updates.role || existingUser.role
          }
        }
      })

      return reply.send(updatedUser)
    } catch (error) {
      app.log.error({ err: error }, 'Error updating user')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user'
      })
    }
  })

  // Delete user (soft delete by setting status to INACTIVE)
  app.delete('/users/:userId', {
    preHandler: [requireActiveTenant],
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { userId } = req.params as { userId: string }

    try {
      // Check if user exists and belongs to organization
      const existingUser = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.tenant!.id
        }
      })

      if (!existingUser) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        })
      }

      // Prevent self-deletion
      if (existingUser.id === req.user?.id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot delete your own account'
        })
      }

      // Soft delete by setting status to INACTIVE
      const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true
        }
      })

      // Log the deletion
      await prisma.event.create({
        data: {
          type: 'USER_DELETED',
          entityType: 'User',
          entityId: userId,
          organizationId: req.tenant!.id,
          userId: req.user?.id,
          metadata: {
            deletedUser: {
              email: existingUser.email,
              name: existingUser.name,
              role: existingUser.role
            }
          }
        }
      })

      return reply.send(deletedUser)
    } catch (error) {
      app.log.error({ err: error }, 'Error deleting user')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete user'
      })
    }
  })

  // Invite user (placeholder - would integrate with email service)
  app.post('/users/invite', {
    preHandler: [requireActiveTenant],
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          role: { 
            type: 'string', 
            enum: ['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'],
            default: 'VIEWER'
          },
          name: { type: 'string' }
        },
        required: ['email']
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { email, role = 'VIEWER', name } = req.body as any

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'User with this email already exists'
        })
      }

      // TODO: Implement actual invitation flow
      // This would typically:
      // 1. Create a pending user record
      // 2. Generate an invitation token
      // 3. Send invitation email
      // 4. Store invitation details

      // For now, return a placeholder response
      return reply.send({
        message: 'Invitation sent successfully',
        email,
        role,
        name
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error inviting user')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send invitation'
      })
    }
  })

  // Get user permissions/role info
  app.get('/users/:userId/permissions', {
    preHandler: [requireActiveTenant],
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { userId } = req.params as { userId: string }

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.tenant!.id
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true
        }
      })

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        })
      }

      // Define permissions based on role
      const permissions = getRolePermissions(user.role)

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status
        },
        permissions
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error fetching user permissions')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user permissions'
      })
    }
  })
}

// Role permissions matrix
function getRolePermissions(role: string) {
  const permissions = {
    // User management
    users: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    // Organization management
    organization: {
      view: false,
      update: false
    },
    // Asset management
    assets: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    // Product management
    products: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    // Issuance management
    issuances: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    // Compliance management
    compliance: {
      view: false,
      verify: false,
      approve: false,
      export: false
    },
    // Authorization management
    authorizations: {
      view: false,
      approve: false,
      reject: false
    },
    // Reports and analytics
    reports: {
      view: false,
      export: false
    },
    // System settings
    settings: {
      view: false,
      update: false
    }
  }

  switch (role) {
    case 'ADMIN':
      // Full access to everything
      Object.keys(permissions).forEach(key => {
        Object.keys(permissions[key as keyof typeof permissions]).forEach(perm => {
          (permissions[key as keyof typeof permissions] as any)[perm] = true
        })
      })
      break

    case 'COMPLIANCE_OFFICER':
      permissions.users.view = true
      permissions.organization.view = true
      permissions.assets.view = true
      permissions.products.view = true
      permissions.issuances.view = true
      permissions.compliance.view = true
      permissions.compliance.verify = true
      permissions.compliance.approve = true
      permissions.compliance.export = true
      permissions.authorizations.view = true
      permissions.authorizations.approve = true
      permissions.authorizations.reject = true
      permissions.reports.view = true
      permissions.reports.export = true
      permissions.settings.view = true
      break

    case 'ISSUER_ADMIN':
      permissions.users.view = true
      permissions.organization.view = true
      permissions.assets.view = true
      permissions.assets.create = true
      permissions.assets.update = true
      permissions.products.view = true
      permissions.products.create = true
      permissions.products.update = true
      permissions.issuances.view = true
      permissions.issuances.create = true
      permissions.issuances.update = true
      permissions.compliance.view = true
      permissions.compliance.verify = true
      permissions.authorizations.view = true
      permissions.authorizations.approve = true
      permissions.reports.view = true
      permissions.reports.export = true
      break

    case 'COMPLIANCE_REVIEWER':
      permissions.assets.view = true
      permissions.products.view = true
      permissions.issuances.view = true
      permissions.compliance.view = true
      permissions.compliance.verify = true
      permissions.authorizations.view = true
      permissions.reports.view = true
      break

    case 'VIEWER':
      permissions.assets.view = true
      permissions.products.view = true
      permissions.issuances.view = true
      permissions.compliance.view = true
      permissions.authorizations.view = true
      permissions.reports.view = true
      break
  }

  return permissions
}
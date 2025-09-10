import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireActiveTenant, tenantMiddleware } from '../../middleware/tenantMiddleware.js'
import type { TenantRequest } from '../../middleware/tenantMiddleware.js'
import crypto from 'crypto'
import { emailService } from '../../lib/emailService.js'

const prisma = new PrismaClient()

// ---------- Authentication Helper ----------
async function verifyAuthIfRequired(req: any, reply: any): Promise<any> {
  const AUTH_MODE = (process.env.AUTH_MODE ?? "off").toLowerCase()
  if (AUTH_MODE === "off") return null

  // Prefer JWT verification if available
  if (typeof (req as any).jwtVerify === 'function') {
    try {
      await (req as any).jwtVerify()
      return (req as any).user
    } catch (err) {
      throw err
    }
  }

  // Fallback to server decorator if present
  if ((req.server as any)?.verifyAuthOrApiKey) {
    await (req.server as any).verifyAuthOrApiKey(req, reply)
    return (req as any).user
  }

  // If no mechanism available, treat as unauthenticated (dev convenience)
  return null
}

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Get users with filtering and pagination
  app.get('/users', {
    preHandler: [tenantMiddleware, requireActiveTenant],
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
      if (updates.role && updates.role !== 'ADMIN' && existingUser.id === req.user?.sub) {
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
          entityType: 'User',
          entityId: userId,
          organizationId: req.tenant!.id,
          userId: req.user?.sub,
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
      if (existingUser.id === req.user?.sub) {
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
          entityType: 'User',
          entityId: userId,
          organizationId: req.tenant!.id,
          userId: req.user?.sub,
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
    preHandler: [tenantMiddleware, requireActiveTenant, verifyAuthIfRequired],
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

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          email,
          role,
          name: name || email.split('@')[0],
          token: invitationToken,
          expiresAt,
          organizationId: req.tenant!.id,
          invitedBy: req.user.sub,
          status: 'PENDING'
        }
      })

      // Send invitation email
      const invitationUrl = `${process.env.UI_ORIGIN || 'http://localhost:3000'}/invite/${invitationToken}`
      
      // Get inviter information
      const inviter = await prisma.user.findUnique({
        where: { sub: req.user.sub },
        select: { name: true, email: true }
      })
      
      const inviterName = inviter?.name || inviter?.email || 'Administrator'
      const organizationName = req.tenant?.name || 'Your Organization'
      
      // Send email invitation
      const emailSent = await emailService.sendInvitationEmail({
        to: email,
        inviterName,
        organizationName,
        role,
        invitationUrl,
        expiresAt: invitation.expiresAt
      })
      
      app.log.info({ 
        email, 
        invitationUrl, 
        invitationId: invitation.id,
        emailSent
      }, 'User invitation created and email sent')

      return reply.send({
        message: 'Invitation sent successfully',
        email,
        role,
        name: name || email.split('@')[0],
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error inviting user')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send invitation'
      })
    }
  })

  // Get pending invitations
  app.get('/users/invitations', {
    preHandler: [requireActiveTenant],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'],
            default: 'PENDING'
          },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query as any
    const offset = (page - 1) * limit

    try {
      const invitations = await prisma.invitation.findMany({
        where: {
          organizationId: req.tenant!.id,
          status
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          invitedBy: true
        }
      })

      const total = await prisma.invitation.count({
        where: {
          organizationId: req.tenant!.id,
          status
        }
      })

      return reply.send({
        invitations,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error fetching invitations')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch invitations'
      })
    }
  })

  // Accept invitation endpoint
  app.post('/users/invitations/:token/accept', {
    schema: {
      params: {
        type: 'object',
        properties: {
          token: { type: 'string' }
        },
        required: ['token']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          password: { type: 'string', minLength: 8 }
        },
        required: ['name', 'password']
      }
    }
  }, async (req, reply) => {
    const { token } = req.params as any
    const { name, password } = req.body as any

    try {
      // Find the invitation
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { organization: true }
      })

      if (!invitation) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Invalid invitation token'
        })
      }

      if (invitation.status !== 'PENDING') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invitation has already been used or expired'
        })
      }

      if (invitation.expiresAt < new Date()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invitation has expired'
        })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email }
      })

      if (existingUser) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'User with this email already exists'
        })
      }

      // Create the user
      const user = await prisma.user.create({
        data: {
          email: invitation.email,
          name,
          sub: `invited-${crypto.randomBytes(16).toString('hex')}`, // Generate a unique sub
          organizationId: invitation.organizationId,
          role: invitation.role,
          status: 'ACTIVE'
        }
      })

      // Update invitation status
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      })

      return reply.send({
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: invitation.organization
        }
      })
    } catch (error) {
      app.log.error({ err: error }, 'Error accepting invitation')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to accept invitation'
      })
    }
  })

  // Test email service endpoint (for development/testing)
  app.post('/users/test-email', {
    preHandler: [requireActiveTenant],
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        },
        required: ['email']
      }
    }
  }, async (req: TenantRequest, reply) => {
    const { email } = req.body as any

    try {
      // Test email connection first
      const connectionOk = await emailService.testConnection()
      if (!connectionOk) {
        return reply.status(500).send({
          error: 'Email Service Error',
          message: 'Email service connection failed'
        })
      }

      // Send test invitation email
      const testInvitationUrl = `${process.env.UI_ORIGIN || 'http://localhost:3000'}/invite/test-token`
      const emailSent = await emailService.sendInvitationEmail({
        to: email,
        inviterName: 'Test Administrator',
        organizationName: req.tenant?.name || 'Test Organization',
        role: 'VIEWER',
        invitationUrl: testInvitationUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })

      if (emailSent) {
        return reply.send({
          message: 'Test email sent successfully',
          email,
          connectionOk: true
        })
      } else {
        return reply.status(500).send({
          error: 'Email Send Error',
          message: 'Failed to send test email'
        })
      }
    } catch (error) {
      app.log.error({ err: error }, 'Error sending test email')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send test email'
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
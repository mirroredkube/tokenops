import type { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const usersPlugin: FastifyPluginAsync = async (app) => {
  // Get user settings
  app.get("/me/settings", async (req, reply) => {
    try {
      await req.jwtVerify()
      const user = req.user as any
      
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub },
        include: {
          settings: true
        }
      })
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" })
      }
      
      // Return default settings if none exist
      const settings = dbUser.settings || {
        timezone: "UTC",
        language: "en",
        theme: "light",
        notifications: {},
        preferences: {}
      }
      
      return reply.send({ settings })
    } catch (error) {
      console.log('JWT verification failed in /me/settings:', error)
      return reply.code(200).send({ settings: null })
    }
  })

  // Update user settings
  app.patch("/me/settings", async (req, reply) => {
    try {
      await req.jwtVerify()
      const user = req.user as any
      const { timezone, language, theme, notifications, preferences } = req.body as {
        timezone?: string
        language?: string
        theme?: string
        notifications?: any
        preferences?: any
      }
      
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      })
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" })
      }
      
      // Upsert settings (create if doesn't exist, update if it does)
      const settings = await prisma.userSettings.upsert({
        where: { userId: dbUser.id },
        update: {
          ...(timezone && { timezone }),
          ...(language && { language }),
          ...(theme && { theme }),
          ...(notifications && { notifications }),
          ...(preferences && { preferences }),
          updatedAt: new Date()
        },
        create: {
          userId: dbUser.id,
          timezone: timezone || "UTC",
          language: language || "en",
          theme: theme || "light",
          notifications: notifications || {},
          preferences: preferences || {}
        }
      })
      
      return reply.send({ settings })
    } catch (error) {
      console.log('JWT verification failed in PATCH /me/settings:', error)
      return reply.code(200).send({ settings: null })
    }
  })

  // Update user profile (name, email)
  app.patch("/me/profile", async (req, reply) => {
    try {
      await req.jwtVerify()
      const user = req.user as any
      const { name, email } = req.body as { name?: string; email?: string }
      
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      })
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" })
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          ...(name && { name }),
          ...(email && { email })
        }
      })
      
      return reply.send({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          twoFactorEnabled: updatedUser.twoFactorEnabled
        }
      })
    } catch (error) {
      console.log('JWT verification failed in PATCH /me/profile:', error)
      return reply.code(200).send({ user: null })
    }
  })
}

export default usersPlugin

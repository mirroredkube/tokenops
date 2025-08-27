import type { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const compliancePlugin: FastifyPluginAsync = async (app) => {
  // Store compliance data off-chain
  app.post('/store', {
    schema: {
      body: {
        type: 'object',
        required: ['tokenTxHash', 'complianceData'],
        properties: {
          tokenTxHash: { type: 'string' },
          complianceData: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            id: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { tokenTxHash, complianceData } = req.body as {
        tokenTxHash: string
        complianceData: any
      }

      // Find the existing token record by transaction hash
      const existingRecord = await prisma.tokenRecord.findUnique({
        where: { txHash: tokenTxHash }
      })

      if (!existingRecord) {
        return reply.status(404).send({
          ok: false,
          error: 'Token record not found for the given transaction hash'
        })
      }

      // Update the token record with compliance data
      const updatedRecord = await prisma.tokenRecord.update({
        where: { txHash: tokenTxHash },
        data: {
          compliance: complianceData
        }
      })

      return reply.send({
        ok: true,
        id: updatedRecord.id,
        message: 'Compliance data stored successfully'
      })
    } catch (error: any) {
      app.log.error('Error storing compliance data:', error)
      return reply.status(500).send({
        ok: false,
        error: 'Failed to store compliance data'
      })
    }
  })

  // Get compliance data for a token
  app.get('/:txHash', {
    schema: {
      params: {
        type: 'object',
        required: ['txHash'],
        properties: {
          txHash: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            compliance: { type: 'object' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { txHash } = req.params as { txHash: string }

      const record = await prisma.tokenRecord.findUnique({
        where: { txHash },
        select: { compliance: true }
      })

      if (!record) {
        return reply.status(404).send({
          ok: false,
          error: 'Token record not found'
        })
      }

      return reply.send({
        ok: true,
        compliance: record.compliance
      })
    } catch (error: any) {
      app.log.error('Error retrieving compliance data:', error)
      return reply.status(500).send({
        ok: false,
        error: 'Failed to retrieve compliance data'
      })
    }
  })
}

export default compliancePlugin

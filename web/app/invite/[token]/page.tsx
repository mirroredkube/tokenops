'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Clock, User, Mail, Shield, AlertTriangle } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  name: string
  role: string
  organizationId: string
  organization: {
    name: string
    subdomain: string
  }
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

export default function InviteAcceptancePage() {
  const { token } = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      fetchInvitation()
    }
  }, [token])

  const fetchInvitation = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await api.GET('/v1/invitations/{token}' as any, {
        params: { path: { token: token as string } }
      })
      
      if (response.data) {
        setInvitation(response.data)
      } else {
        setError('Invitation not found or has expired')
      }
    } catch (err: any) {
      console.error('Error fetching invitation:', err)
      setError(err?.data?.message || 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invitation) return
    
    try {
      setAccepting(true)
      setError('')
      
      const response = await api.POST('/v1/invitations/{token}/accept' as any, {
        params: { path: { token: token as string } },
        body: {
          name: invitation.name
        }
      })
      
      if (response.data) {
        setSuccess(true)
        // Redirect to login or dashboard after a short delay
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err?.data?.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date()
  const isAccepted = invitation?.status === 'ACCEPTED'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TokenOps!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully joined {invitation?.organization.name}. 
            You can now log in to access your account.
          </p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold mb-2">You're Invited!</h1>
          <p className="text-emerald-100">Join {invitation?.organization.name} on TokenOps</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700 font-medium">This invitation has expired</p>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700 font-medium">This invitation has already been accepted</p>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="flex items-center text-gray-600">
              <User className="h-5 w-5 mr-3" />
              <span className="font-medium">Name:</span>
              <span className="ml-2">{invitation?.name}</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Mail className="h-5 w-5 mr-3" />
              <span className="font-medium">Email:</span>
              <span className="ml-2">{invitation?.email}</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Shield className="h-5 w-5 mr-3" />
              <span className="font-medium">Role:</span>
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {invitation?.role}
              </span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Clock className="h-5 w-5 mr-3" />
              <span className="font-medium">Expires:</span>
              <span className="ml-2">
                {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            TokenOps is a comprehensive platform for secure and compliant token issuance, 
            helping organizations manage their digital assets with enterprise-grade security 
            and regulatory compliance.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {!isExpired && !isAccepted && (
              <button
                onClick={acceptInvitation}
                disabled={accepting}
                className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {accepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </button>
            )}
            
            <button
              onClick={() => router.push('/login')}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-xs text-gray-500">
            This invitation was sent to {invitation?.email}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            If you didn't expect this invitation, you can safely ignore this page.
          </p>
        </div>
      </div>
    </div>
  )
}

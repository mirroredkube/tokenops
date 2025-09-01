'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import CustomDropdown from '../../components/CustomDropdown'
import { getUserSettings, updateUserSettings, updateUserProfile } from '@/lib/api'
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Key, 
  Globe,
  Save,
  Edit3,
  QrCode,
  Smartphone,
  CheckCircle,
  X,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage()
  const { t, ready } = useTranslation(['settings', 'common'])
  const [hasChanges, setHasChanges] = useState(false)
  const [originalLanguage, setOriginalLanguage] = useState(currentLanguage)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: 'UTC',
    language: currentLanguage === 'en' ? 'English' : 'German',
    notifications: {
      email: true,
      push: false,
      security: true
    }
  })

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [showDisableTwoFactor, setShowDisableTwoFactor] = useState(false)
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [disableVerificationCode, setDisableVerificationCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load user settings and profile data on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load user settings
        const settings = await getUserSettings()
        
        // Set original language for cancel functionality
        setOriginalLanguage(settings.language || currentLanguage)
        
        // Populate form data with user info and settings
        setFormData(prev => ({
          ...prev,
          name: user?.name || '',
          email: user?.email || '',
          timezone: settings.timezone || 'UTC',
          language: settings.language === 'en' ? 'English' : 'German',
          notifications: {
            email: settings.notifications?.email ?? true,
            push: settings.notifications?.push ?? false,
            security: settings.notifications?.security ?? true
          }
        }))
      } catch (error) {
        console.log('Could not load user settings, using defaults')
        // Fallback to user data from context
        setFormData(prev => ({
          ...prev,
          name: user?.name || '',
          email: user?.email || '',
        }))
      }
    }
    
    if (user) {
      loadSettings()
    }
  }, [user, currentLanguage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: checked
        }
      }))
      setHasChanges(true)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      
      // Save profile data (name, email)
      if (user && (formData.name !== user.name || formData.email !== user.email)) {
        await updateUserProfile({
          name: formData.name,
          email: formData.email
        })
      }
      
      // Language is already saved immediately when changed, so we don't need to save it again
      
      // Save other settings (timezone, notifications)
      await updateUserSettings({
        timezone: formData.timezone,
        notifications: formData.notifications
      })
      
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    // Revert language to original if it was changed
    if (originalLanguage !== currentLanguage) {
      await setLanguage(originalLanguage)
    }
    
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      timezone: 'UTC',
      language: originalLanguage === 'en' ? 'English' : 'German',
      notifications: {
        email: true,
        push: false,
        security: true
      }
    })
    setHasChanges(false)
  }

  // 2FA API Functions
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    return response
  }

  const getTwoFactorStatus = async () => {
    try {
      const response = await fetchWithAuth('/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setTwoFactorEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error)
    }
  }

  const setupTwoFactor = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth('/auth/2fa/setup', {
        method: 'POST',
        body: JSON.stringify({}) // Send empty JSON object instead of empty body
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorSecret(data.secret)
        
        // Generate QR code from the otpauth URL
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(data.otpauth)
          setTwoFactorQrCode(qrCodeDataUrl)
        } catch (error) {
          console.error('Error generating QR code:', error)
          // Fallback to the provided QR code URL
          setTwoFactorQrCode(data.qrCodeUrl)
        }
        
        setShowTwoFactorSetup(true)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnableTwoFactor = async () => {
    await setupTwoFactor()
  }

  const handleVerifyTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    setVerificationError('')

    try {
      const response = await fetchWithAuth('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({
          secret: twoFactorSecret,
          token: verificationCode
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorEnabled(true)
        setShowTwoFactorSetup(false)
        setVerificationCode('')
        setTwoFactorSecret('')
        setTwoFactorQrCode('')
        // Refresh 2FA status
        await getTwoFactorStatus()
      } else {
        const errorData = await response.json()
        setVerificationError(errorData.error || 'Invalid verification code. Please try again.')
      }
    } catch (error) {
      setVerificationError('Invalid verification code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    if (!disableVerificationCode || disableVerificationCode.length !== 6) {
      setVerificationError('Please enter a valid 6-digit code')
      return
    }

    try {
      setIsLoading(true)
      setVerificationError('')
      
      const response = await fetchWithAuth('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({
          token: disableVerificationCode
        })
      })
      
      if (response.ok) {
        setTwoFactorEnabled(false)
        setDisableVerificationCode('')
        setShowDisableTwoFactor(false)
        setVerificationError('')
        // Refresh 2FA status
        await getTwoFactorStatus()
      } else {
        const errorData = await response.json()
        setVerificationError(errorData.error || 'Failed to disable 2FA')
      }
    } catch (error) {
      setVerificationError('Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Fetch 2FA status on component mount
  useEffect(() => {
    getTwoFactorStatus()
  }, [])

  // Show loading state while translations are not ready
  if (!ready) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Loading translations...</p>
        </div>
      </div>
    )
  }

  // Debug: Check if translations are working
  console.log('Translation test:', {
    edit: t('common:actions.edit'),
    cancel: t('common:actions.cancel'),
    saveChanges: t('settings:actions.saveChanges'),
    ready,
    currentLanguage
  })

  // Debug: Check user and organization data
  console.log('User data:', user)
  console.log('Organization data:', user?.organization)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('description')}</p>
      </div>

      <div className="space-y-8">
        {/* Profile Information */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('profile')}</h2>
                <p className="text-sm text-gray-600">{t('settings:descriptions.updatePersonalDetails', 'Update your personal details')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.name')}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.email')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>


          </div>
        </div>

        {/* Organization Information */}
        {user?.organization && (
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Organization</h2>
                    <p className="text-sm text-gray-600">Your organization details and membership</p>
                  </div>
                </div>
                <button
                  onClick={refreshUser}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  title="Refresh organization data"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {user.organization.name}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Name
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {user.organization.legalName || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {user.organization.country}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jurisdiction
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {user.organization.jurisdiction || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Security */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('security')}</h2>
                <p className="text-sm text-gray-600">{t('settings:descriptions.manageAccountSecurity', 'Manage your account security settings')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-900">{t('fields.twoFactorAuth')}</h3>
                <p className="text-sm text-gray-600">
                  {twoFactorEnabled 
                    ? t('settings:descriptions.twoFactorAuthEnabled', 'Two-factor authentication is enabled for your account')
                    : t('settings:descriptions.addExtraSecurity', 'Add an extra layer of security to your account')
                  }
                </p>
              </div>
              {twoFactorEnabled ? (
                <button 
                  onClick={() => setShowDisableTwoFactor(true)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {t('actions.disable') || 'Disable'}
                </button>
              ) : (
                <button 
                  onClick={handleEnableTwoFactor}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-md hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      {t('settings:twoFactorAuth.settingUp', 'Setting up...')}
                    </>
                  ) : (
                    t('actions.enable') || 'Enable'
                  )}
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-900">{t('settings:apiKeys.title', 'API Keys')}</h3>
                <p className="text-sm text-gray-600">{t('settings:descriptions.manageApiKeys', 'Manage your API keys for programmatic access')}</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
                <Key className="w-4 h-4" />
                {t('settings:apiKeys.manageKeys', 'Manage Keys')}
              </button>
            </div>
          </div>
        </div>

        {/* 2FA Setup Modal */}
        {showTwoFactorSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('settings:twoFactorAuth.setupTitle', 'Set Up Two-Factor Authentication')}</h2>
                  <button
                    onClick={() => setShowTwoFactorSetup(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Step 1: Download App */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">{t('settings:twoFactorAuth.step1Title', 'Step 1: Download an Authenticator App')}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('settings:twoFactorAuth.step1Description', 'Download one of these authenticator apps on your mobile device:')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="text-gray-700">{t('settings:authenticatorApps.googleAuthenticator', 'Google Authenticator')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="text-gray-700">{t('settings:authenticatorApps.authy', 'Authy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="text-gray-700">{t('settings:authenticatorApps.microsoftAuthenticator', 'Microsoft Authenticator')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Scan QR Code */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">{t('settings:twoFactorAuth.step2Title', 'Step 2: Scan QR Code')}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('settings:twoFactorAuth.step2Description', 'Open your authenticator app and scan this QR code:')}
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-gray-100 p-4 rounded-lg">
                        {twoFactorQrCode ? (
                          <img 
                            src={twoFactorQrCode} 
                            alt="QR Code for 2FA setup" 
                            className="w-48 h-48"
                          />
                        ) : (
                          <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">{t('settings:twoFactorAuth.loadingQrCode', 'Loading QR Code...')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Manual Entry */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">{t('settings:twoFactorAuth.step3Title', 'Step 3: Manual Entry (Alternative)')}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('settings:twoFactorAuth.step3Description', 'If you can\'t scan the QR code, enter this secret manually:')}
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <code className="flex-1 font-mono text-sm">
                        {showSecret ? twoFactorSecret : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(twoFactorSecret)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step 4: Verify */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">{t('settings:twoFactorAuth.step4Title', 'Step 4: Verify Setup')}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('settings:twoFactorAuth.step4Description', 'Enter the 6-digit code from your authenticator app:')}
                    </p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg font-mono tracking-widest"
                        maxLength={6}
                      />
                      {verificationError && (
                        <p className="text-sm text-red-600">{verificationError}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowTwoFactorSetup(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      {t('common:actions.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleVerifyTwoFactor}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {t('settings:twoFactorAuth.verifying', 'Verifying...')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {t('settings:actions.verifyAndEnable', 'Verify & Enable')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings:notifications', 'Notifications')}</h2>
                <p className="text-sm text-gray-600">{t('settings:descriptions.configureNotifications', 'Configure how you receive notifications')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-900">{t('settings:fields.emailNotifications', 'Email Notifications')}</h3>
                <p className="text-sm text-gray-600">{t('settings:descriptions.receiveEmailUpdates', 'Receive important updates via email')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="email"
                  checked={formData.notifications.email}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-900">{t('settings:fields.securityAlerts', 'Security Alerts')}</h3>
                <p className="text-sm text-gray-600">{t('settings:descriptions.getSecurityAlerts', 'Get notified about security events')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="security"
                  checked={formData.notifications.security}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings:preferences', 'Preferences')}</h2>
                <p className="text-sm text-gray-600">{t('settings:descriptions.customizeExperience', 'Customize your experience')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.timezone')}
                </label>
                <CustomDropdown
                  value={formData.timezone}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, timezone: value }))
                    setHasChanges(true)
                  }}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                    { value: 'Asia/Tokyo', label: 'Tokyo' }
                  ]}
                  className="w-full"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.language')}
                </label>
                <CustomDropdown
                  value={availableLanguages.find(lang => lang.value === currentLanguage)?.label || ''}
                  onChange={async (value) => {
                    const lang = availableLanguages.find(l => l.label === value)?.value || 'en'
                    // Change language immediately
                    await setLanguage(lang)
                    // Track for save/cancel
                    setFormData(prev => ({ ...prev, language: value }))
                    setHasChanges(true)
                  }}
                  options={availableLanguages.map(lang => ({
                    value: lang.label,
                    label: lang.label
                  }))}
                  placeholder={t('common:select', 'Select an option')}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2FA Disable Modal */}
        {showDisableTwoFactor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('settings:twoFactorAuth.disableTitle', 'Disable Two-Factor Authentication')}</h2>
                  <button
                    onClick={() => {
                      setShowDisableTwoFactor(false)
                      setDisableVerificationCode('')
                      setVerificationError('')
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('settings:twoFactorAuth.disableDescription', 'To disable two-factor authentication, please enter the 6-digit code from your authenticator app.')}
                    </p>
                    
                    <div>
                      <label htmlFor="disable-verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('settings:twoFactorAuth.verificationCode', 'Verification Code')}
                      </label>
                      <input
                        id="disable-verification-code"
                        type="text"
                        value={disableVerificationCode}
                        onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        autoFocus
                      />
                    </div>

                    {verificationError && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                        {verificationError}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDisableTwoFactor}
                      disabled={isLoading || disableVerificationCode.length !== 6}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {t('settings:twoFactorAuth.disabling', 'Disabling...')}
                        </>
                      ) : (
                        t('settings:twoFactorAuth.disable2FA', 'Disable 2FA')
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisableTwoFactor(false)
                        setDisableVerificationCode('')
                        setVerificationError('')
                      }}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      {t('common:actions.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Changes Button */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex justify-end gap-3">
            {hasChanges && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 text-gray-600 border border-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {t('common:actions.cancel', 'Cancel') || 'Cancel'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="flex items-center gap-2 px-6 py-3 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                  {t('common:actions.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('settings:actions.saveChanges') || 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

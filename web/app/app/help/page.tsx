'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  BookOpen, 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Play,
  Shield,
  Coins,
  Wallet,
  FileText,
  Plus,
  CheckSquare
} from 'lucide-react'

export default function HelpPage() {
  const { t } = useTranslation(['help', 'common'])
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['getting-started']))

  const toggleSection = (sectionId: string) => {
    const newOpenSections = new Set(openSections)
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId)
    } else {
      newOpenSections.add(sectionId)
    }
    setOpenSections(newOpenSections)
  }

  const faqItems = [
    {
      question: t('help:faq.whatIsRegula.question', 'What is Regula?'),
      answer: t('help:faq.whatIsRegula.answer', 'Regula is a compliance-grade tokenization platform that allows you to create assets, issue tokens, and manage authorizations with built-in compliance controls, audit trails, and role-based access. It supports multiple ledgers including XRPL, with Hedera and Ethereum coming soon.')
    },
    {
      question: t('help:faq.howToGetStarted.question', 'How do I get started?'),
      answer: t('help:faq.howToGetStarted.answer', 'To get started, first create an asset, then set up authorizations for holders, and finally use the issuance page to mint tokens. You can monitor all activity through the dashboard and export reports as needed.')
    },
    {
      question: t('help:faq.supportedLedgers.question', 'What ledgers are supported?'),
      answer: t('help:faq.supportedLedgers.answer', 'Currently, XRPL (XRP Ledger) is fully supported with asset creation, authorizations, and issuance. Hedera and Ethereum adapters are in development.')
    },
    {
      question: t('help:faq.assetsVsIssuances.question', 'What\'s the difference between Assets and Issuances?'),
      answer: t('help:faq.assetsVsIssuances.answer', 'Assets are the token definitions (like a currency code and metadata), while Issuances are the actual minting of tokens to specific addresses. You create an asset once, then can issue it multiple times to different holders.')
    },
    {
      question: t('help:faq.manageCompliance.question', 'How do I manage compliance?'),
      answer: t('help:faq.manageCompliance.answer', 'Regula includes built-in compliance records, audit trails, and export capabilities. All transactions are logged and can be exported for audit purposes. Use the Compliance page to verify records and the Reports page to export data.')
    },
    {
      question: t('help:faq.integration.question', 'Can I integrate with my existing systems?'),
      answer: t('help:faq.integration.answer', 'Yes, Regula provides RESTful APIs for programmatic access. Visit the API Documentation section to explore the complete API reference with interactive testing tools.')
    }
  ]

  const quickActions = [
    {
      title: t('help:quickActions.createAsset.title', 'Create Asset'),
      description: t('help:quickActions.createAsset.description', 'Create a new token asset with metadata and compliance settings'),
      icon: <Plus className="h-5 w-5" />,
      href: "/app/assets/create",
      external: false
    },
    {
      title: t('help:quickActions.startIssuance.title', 'Start Issuance'),
      description: t('help:quickActions.startIssuance.description', 'Issue assets to addresses with compliance controls'),
      icon: <Coins className="h-5 w-5" />,
      href: "/app/issuance/new",
      external: false
    },
    {
      title: t('help:quickActions.setupAuthorization.title', 'Setup Authorization'),
      description: t('help:quickActions.setupAuthorization.description', 'Create and manage asset authorizations for holders'),
      icon: <CheckSquare className="h-5 w-5" />,
      href: "/app/authorizations",
      external: false
    },
    {
      title: t('help:quickActions.verifyCompliance.title', 'Verify Compliance'),
      description: t('help:quickActions.verifyCompliance.description', 'Review and verify compliance records'),
      icon: <Shield className="h-5 w-5" />,
      href: "/app/compliance",
      external: false
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('help:page.title', 'Help Center')}</h1>
        <p className="text-gray-600 mt-2">{t('help:page.description', 'Find answers to common questions and learn how to use Regula')}</p>
      </div>

      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('help:sections.quickActions.title', 'Quick Actions')}</h2>
                <p className="text-sm text-gray-600">{t('help:sections.quickActions.description', 'Get started with common tasks')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  target={action.external ? "_blank" : undefined}
                  rel={action.external ? "noopener noreferrer" : undefined}
                  className="flex items-start gap-2 p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                  {action.external && (
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('help:sections.gettingStarted.title', 'Getting Started')}</h2>
                <p className="text-sm text-gray-600">{t('help:sections.gettingStarted.description', 'Learn the basics of using Regula')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:gettingStarted.step1.title', 'Step 1: Create an Asset')}</h3>
                <p className="text-gray-600 mb-2">
                  {t('help:gettingStarted.step1.description', 'Define your token with metadata, compliance settings, and ledger configuration.')}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{t('help:gettingStarted.step1.items.0', 'Set token code, name, and description')}</li>
                  <li>{t('help:gettingStarted.step1.items.1', 'Configure compliance mode and metadata')}</li>
                  <li>{t('help:gettingStarted.step1.items.2', 'Select ledger and network settings')}</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:gettingStarted.step2.title', 'Step 2: Setup Authorizations')}</h3>
                <p className="text-gray-600 mb-2">
                  {t('help:gettingStarted.step2.description', 'Create authorizations for holders to receive your tokens.')}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{t('help:gettingStarted.step2.items.0', 'Select ledger and asset for authorization')}</li>
                  <li>{t('help:gettingStarted.step2.items.1', 'Set holder limits and restrictions')}</li>
                  <li>{t('help:gettingStarted.step2.items.2', 'Configure authorization parameters')}</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:gettingStarted.step3.title', 'Step 3: Issue Tokens')}</h3>
                <p className="text-gray-600 mb-2">
                  {t('help:gettingStarted.step3.description', 'Mint tokens to authorized addresses with compliance controls.')}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{t('help:gettingStarted.step3.items.0', 'Select asset and target holder')}</li>
                  <li>{t('help:gettingStarted.step3.items.1', 'Set issuance amount and metadata')}</li>
                  <li>{t('help:gettingStarted.step3.items.2', 'Submit and monitor transaction status')}</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:gettingStarted.step4.title', 'Step 4: Monitor & Report')}</h3>
                <p className="text-gray-600 mb-2">
                  {t('help:gettingStarted.step4.description', 'Track balances, verify compliance, and export audit-ready reports.')}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{t('help:gettingStarted.step4.items.0', 'Monitor outstanding supply and holder balances')}</li>
                  <li>{t('help:gettingStarted.step4.items.1', 'Verify compliance records and export reports')}</li>
                  <li>{t('help:gettingStarted.step4.items.2', 'Track system health and transaction status')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('help:sections.faq.title', 'Frequently Asked Questions')}</h2>
                <p className="text-sm text-gray-600">{t('help:sections.faq.description', 'Find answers to common questions')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <h3 className="font-medium text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-sm text-gray-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('help:sections.apiDocs.title', 'API Documentation')}</h2>
                <p className="text-sm text-gray-600">{t('help:sections.apiDocs.description', 'Complete API reference for developers')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:apiDocs.title', 'REST API Reference')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('help:apiDocs.description', 'Regula provides a comprehensive REST API for programmatic access to all platform features. The API supports asset creation, issuances, authorizations, compliance management, and reporting.')}
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('help:apiDocs.openInteractiveDocs', 'Open Interactive API Documentation')}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{t('help:apiDocs.keyEndpoints.title', 'Key Endpoints')}</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('help:apiDocs.keyEndpoints.items.0', 'Assets: Create and manage token definitions')}</li>
                    <li>• {t('help:apiDocs.keyEndpoints.items.1', 'Issuances: Mint tokens to addresses')}</li>
                    <li>• {t('help:apiDocs.keyEndpoints.items.2', 'Authorizations: Manage holder permissions')}</li>
                    <li>• {t('help:apiDocs.keyEndpoints.items.3', 'Compliance: Verify and manage records')}</li>
                    <li>• {t('help:apiDocs.keyEndpoints.items.4', 'Reports: Export data and analytics')}</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{t('help:apiDocs.features.title', 'Features')}</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('help:apiDocs.features.items.0', 'Interactive documentation with testing')}</li>
                    <li>• {t('help:apiDocs.features.items.1', 'Authentication and authorization')}</li>
                    <li>• {t('help:apiDocs.features.items.2', 'Rate limiting and error handling')}</li>
                    <li>• {t('help:apiDocs.features.items.3', 'JSON request/response format')}</li>
                    <li>• {t('help:apiDocs.features.items.4', 'Webhook support for real-time updates')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('help:sections.support.title', 'Support & Contact')}</h2>
                <p className="text-sm text-gray-600">{t('help:sections.support.description', 'Get help when you need it')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:support.documentation.title', 'Documentation')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('help:support.documentation.description', 'Comprehensive guides and resources to help you use Regula effectively, including API documentation for developers.')}
                </p>
                <a
                  href="#api-docs"
                  className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {t('help:support.documentation.viewApiDocs', 'View API Documentation')}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('help:support.contact.title', 'Contact Support')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('help:support.contact.description', 'Need help? Our support team is here to assist you with any questions or issues.')}
                </p>
                <a
                  href="mailto:support@regula.com?subject=Regula%20Support%20Request"
                  className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <Mail className="w-4 h-4" />
                  {t('help:support.contact.emailSupport', 'Email Support')}
                </a>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{t('help:support.hours.title', 'Support Hours')}</h4>
                <p className="text-sm text-gray-600">
                  {t('help:support.hours.description', 'Our support team is available Monday through Friday, 9:00 AM - 6:00 PM EST. For urgent issues, please include "URGENT" in your email subject line.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

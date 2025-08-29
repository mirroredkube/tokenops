'use client'

import { useState } from 'react'
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
      question: "What is Regula?",
      answer: "Regula is a compliance-grade tokenization platform that allows you to create assets, issue tokens, and manage authorizations with built-in compliance controls, audit trails, and role-based access. It supports multiple ledgers including XRPL, with Hedera and Ethereum coming soon."
    },
    {
      question: "How do I get started?",
      answer: "To get started, first create an asset, then set up authorizations for holders, and finally use the issuance page to mint tokens. You can monitor all activity through the dashboard and export reports as needed."
    },
    {
      question: "What ledgers are supported?",
      answer: "Currently, XRPL (XRP Ledger) is fully supported with asset creation, authorizations, and issuance. Hedera and Ethereum adapters are in development."
    },
    {
      question: "What's the difference between Assets and Issuances?",
      answer: "Assets are the token definitions (like a currency code and metadata), while Issuances are the actual minting of tokens to specific addresses. You create an asset once, then can issue it multiple times to different holders."
    },
    {
      question: "How do I manage compliance?",
      answer: "Regula includes built-in compliance records, audit trails, and export capabilities. All transactions are logged and can be exported for audit purposes. Use the Compliance page to verify records and the Reports page to export data."
    },
    {
      question: "Can I integrate with my existing systems?",
      answer: "Yes, Regula provides RESTful APIs for programmatic access. Visit the API Documentation section to explore the complete API reference with interactive testing tools."
    }
  ]

  const quickActions = [
    {
      title: "Create Asset",
      description: "Create a new token asset with metadata and compliance settings",
      icon: <Plus className="h-5 w-5" />,
      href: "/app/assets/create",
      external: false
    },
    {
      title: "Start Issuance",
      description: "Issue assets to addresses with compliance controls",
      icon: <Coins className="h-5 w-5" />,
      href: "/app/issuance/new",
      external: false
    },
    {
      title: "Setup Authorization",
      description: "Create and manage asset authorizations for holders",
      icon: <CheckSquare className="h-5 w-5" />,
      href: "/app/authorizations",
      external: false
    },
    {
      title: "Verify Compliance",
      description: "Review and verify compliance records",
      icon: <Shield className="h-5 w-5" />,
      href: "/app/compliance",
      external: false
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600 mt-2">Find answers to common questions and learn how to use Regula</p>
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
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-600">Get started with common tasks</p>
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
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
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
            <button
              onClick={() => toggleSection('getting-started')}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
                  <p className="text-sm text-gray-600">Learn the basics of using Regula</p>
                </div>
              </div>
              {openSections.has('getting-started') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {openSections.has('getting-started') && (
            <div className="p-6 border-t border-gray-200">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 1: Create an Asset</h3>
                  <p className="text-gray-600 mb-2">
                    Define your token with metadata, compliance settings, and ledger configuration.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Set token code, name, and description</li>
                    <li>Configure compliance mode and metadata</li>
                    <li>Select ledger and network settings</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 2: Setup Authorizations</h3>
                  <p className="text-gray-600 mb-2">
                    Create authorizations for holders to receive your tokens.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Select ledger and asset for authorization</li>
                    <li>Set holder limits and restrictions</li>
                    <li>Configure authorization parameters</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 3: Issue Tokens</h3>
                  <p className="text-gray-600 mb-2">
                    Mint tokens to authorized addresses with compliance controls.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Select asset and target holder</li>
                    <li>Set issuance amount and metadata</li>
                    <li>Submit and monitor transaction status</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 4: Monitor & Report</h3>
                  <p className="text-gray-600 mb-2">
                    Track balances, verify compliance, and export audit-ready reports.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Monitor outstanding supply and holder balances</li>
                    <li>Verify compliance records and export reports</li>
                    <li>Track system health and transaction status</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('faq')}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
                  <p className="text-sm text-gray-600">Find answers to common questions</p>
                </div>
              </div>
              {openSections.has('faq') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {openSections.has('faq') && (
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
          )}
        </div>

        {/* API Documentation */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('api-docs')}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">API Documentation</h2>
                  <p className="text-sm text-gray-600">Complete API reference for developers</p>
                </div>
              </div>
              {openSections.has('api-docs') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {openSections.has('api-docs') && (
            <div className="p-6 border-t border-gray-200">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">REST API Reference</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Regula provides a comprehensive REST API for programmatic access to all platform features. 
                    The API supports asset creation, issuances, authorizations, compliance management, and reporting.
                  </p>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open Interactive API Documentation
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Key Endpoints</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Assets: Create and manage token definitions</li>
                      <li>• Issuances: Mint tokens to addresses</li>
                      <li>• Authorizations: Manage holder permissions</li>
                      <li>• Compliance: Verify and manage records</li>
                      <li>• Reports: Export data and analytics</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Interactive documentation with testing</li>
                      <li>• Authentication and authorization</li>
                      <li>• Rate limiting and error handling</li>
                      <li>• JSON request/response format</li>
                      <li>• Webhook support for real-time updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('support')}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Support & Contact</h2>
                  <p className="text-sm text-gray-600">Get help when you need it</p>
                </div>
              </div>
              {openSections.has('support') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {openSections.has('support') && (
            <div className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Documentation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Comprehensive guides and resources to help you use Regula effectively, including API documentation for developers.
                  </p>
                  <a
                    href="#api-docs"
                    onClick={() => toggleSection('api-docs')}
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View API Documentation
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Support</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Need help? Our support team is here to assist you with any questions or issues.
                  </p>
                  <a
                    href="mailto:support@regula.com?subject=Regula%20Support%20Request"
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    Email Support
                  </a>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Support Hours</h4>
                <p className="text-sm text-gray-600">
                  Our support team is available Monday through Friday, 9:00 AM - 6:00 PM EST. 
                  For urgent issues, please include "URGENT" in your email subject line.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

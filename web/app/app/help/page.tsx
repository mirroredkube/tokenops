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
  FileText
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
      answer: "Regula is a compliance-grade tokenization platform that allows you to issue and govern tokens with built-in compliance controls, audit trails, and role-based access. It supports multiple ledgers including XRPL, Hedera, and Ethereum."
    },
    {
      question: "How do I get started?",
      answer: "To get started, first create a trustline for your token, then use the issuance page to mint your first token. You can monitor all activity through the dashboard."
    },
    {
      question: "What ledgers are supported?",
      answer: "Currently, XRPL (XRP Ledger) is fully supported with trustline management. Hedera and Ethereum adapters are coming soon."
    },
    {
      question: "Is this production ready?",
      answer: "Yes, the platform is production-ready with enterprise-grade infrastructure, monitoring, logging, and support for production deployments."
    },
    {
      question: "How do I manage compliance?",
      answer: "Regula includes built-in metadata support, audit trails, and export capabilities for regulatory compliance. All transactions are logged and can be exported for audit purposes."
    },
    {
      question: "Can I integrate with my existing systems?",
      answer: "Yes, Regula provides RESTful APIs for programmatic access, making it perfect for integrations and automation with your existing systems."
    }
  ]

  const quickActions = [
    {
      title: "Issue Your First Token",
      description: "Learn how to create and issue tokens on supported ledgers",
      icon: <Coins className="h-5 w-5" />,
              href: "/app/issuance/new",
      external: true
    },
    {
      title: "Create Trust Lines",
              description: "Set up asset authorizations for XRPL token management",
      icon: <Shield className="h-5 w-5" />,
      href: "/app/opt-in",
      external: true
    },
    {
      title: "View Balances",
      description: "Check token balances and transaction history",
      icon: <Wallet className="h-5 w-5" />,
      href: "/app/balances",
      external: true
    },
    {
      title: "API Documentation",
      description: "Explore the complete API reference",
      icon: <FileText className="h-5 w-5" />,
      href: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`,
      external: true
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
                  <h3 className="font-semibold text-gray-900 mb-3">Step 1: Connect Your Issuer</h3>
                  <p className="text-gray-600 mb-2">
                    Configure your issuer account and workspace. No mainnet funds are required for pilots.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Set up your issuer credentials</li>
                    <li>Configure your workspace settings</li>
                    <li>Verify your account permissions</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 2: Create Trust Lines</h3>
                  <p className="text-gray-600 mb-2">
                    Establish holder limits and policies for your tokens.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Define token limits and restrictions</li>
                    <li>Add KYC/AML flags as needed</li>
                    <li>Set transfer restrictions and compliance rules</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 3: Issue Tokens</h3>
                  <p className="text-gray-600 mb-2">
                    Mint tokens with structured metadata and compliance controls.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Create tokens with proper metadata</li>
                    <li>Set initial supply and distribution</li>
                    <li>Configure compliance flags</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Step 4: Monitor & Export</h3>
                  <p className="text-gray-600 mb-2">
                    Track balances and events, export audit-ready reports.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Monitor real-time balances and transactions</li>
                    <li>Export audit-ready CSV/JSON reports</li>
                    <li>Set up alerts for important events</li>
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
                    Comprehensive guides and API documentation to help you integrate and use Regula effectively.
                  </p>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
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

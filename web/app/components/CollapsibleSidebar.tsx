'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  Shield, 
  Coins, 
  Wallet, 
  FileText,
  Menu,
  X
} from 'lucide-react'

const BRAND = 'Regula'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/app/trustlines', label: 'Create Trust Line', icon: <Shield className="h-4 w-4" /> },
  { href: '/app/issuance', label: 'Issue Token', icon: <Coins className="h-4 w-4" /> },
  { href: '/app/balances', label: 'View Balances', icon: <Wallet className="h-4 w-4" /> },
  { href: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`, label: 'API Docs', icon: <FileText className="h-4 w-4" /> },
]

export default function CollapsibleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-56'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center border-b border-gray-200 ${isCollapsed ? 'justify-center p-2' : 'justify-between p-4'}`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2 font-semibold">
                <img
                  src="/brand/logo.svg"
                  width={24}
                  height={24}
                  alt="Regula logo"
                  className="h-6 w-6"
                />
                <span className="text-xl">{BRAND}</span>
              </div>
            ) : (
              <img
                src="/brand/logo.svg"
                width={24}
                height={24}
                alt="Regula logo"
                className="h-6 w-6"
              />
            )}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const isExternal = item.href.startsWith('http')
              
              if (isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors
                      ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                    `}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </a>
                )
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center rounded-lg text-sm font-medium transition-colors
                    ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {!isCollapsed && <span>Regula Platform</span>}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

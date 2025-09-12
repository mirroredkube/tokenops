'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { usePermissions } from './RoleGuard'
import { 
  LayoutDashboard, 
  Shield, 
  Coins, 
  Wallet, 
  Menu,
  X as XIcon,
  User,
  Package,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  CheckSquare,
  BarChart3,
  Plus,
  Clock,
  Key
} from 'lucide-react'

const BRAND = 'Regula'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  section?: string
  subItems?: NavItem[]
}

export default function CollapsibleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { t } = useTranslation(['common'])

  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { canManageUsers, canManageProducts, canCreateAssets, canManageIssuances, canViewReports } = usePermissions()

  const navItems: NavItem[] = [
    { href: '/app/dashboard', label: t('navigation.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    // Products - show for all roles (view-only for some)
    { href: '/app/products', label: t('navigation.products'), icon: <Package className="h-5 w-5" /> },
    // Assets - show for all roles (view-only for some)
    { href: '/app/assets', label: t('navigation.assets'), icon: <Building className="h-5 w-5" /> },
    // Issuer Addresses - show for all roles (view-only for some)
    { href: '/app/issuer-addresses', label: t('navigation.issuerAddresses'), icon: <Key className="h-5 w-5" /> },
    // Issuances - show for all roles (view-only for some)
    { href: '/app/issuance/new', label: t('navigation.issuances'), icon: <Coins className="h-5 w-5" /> },
    // Users - only for admins
    ...(canManageUsers ? [{ href: '/app/users', label: t('navigation.users'), icon: <User className="h-5 w-5" /> }] : []),
    // Authorizations - show for all roles (view-only for some)
    { href: '/app/authorizations', label: t('navigation.authorizations'), icon: <CheckSquare className="h-5 w-5" /> },
    // Compliance - show for all roles (view-only for some)
    { href: '/app/compliance', label: t('navigation.compliance'), icon: <Shield className="h-5 w-5" /> },
    // Reports - show for all roles (view-only for some)
    { href: '/app/reports', label: t('navigation.reports'), icon: <BarChart3 className="h-5 w-5" /> },
    // Balances - show for all roles
    { href: '/app/balances', label: t('navigation.balances'), icon: <Wallet className="h-5 w-5" /> },
  ]

  const bottomNavItems: NavItem[] = [
    { href: '/app/settings', label: t('navigation.settings'), icon: <Settings className="h-5 w-5" />, section: 'ACCOUNT' },
    { href: '/app/help', label: t('navigation.help'), icon: <HelpCircle className="h-5 w-5" />, section: 'HELP' },
  ]

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen)
  


  const handleLogout = async () => {
    await logout()
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        {isMobileOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-slate-800 text-white
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center border-b border-slate-700 ${isCollapsed ? 'justify-center p-3' : 'justify-between p-4'}`}>
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
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Main Navigation */}
          <nav className={`flex-1 space-y-1 ${isCollapsed ? 'p-2' : 'p-3'}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isExternal = item.href.startsWith('http')
              
              if (isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center rounded-md text-sm font-medium transition-colors
                      ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                      ${isActive 
                        ? 'bg-emerald-900/50 text-emerald-300 border-l-2 border-emerald-500' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }
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
                    flex items-center rounded-md text-sm font-medium transition-colors
                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                    ${isActive 
                      ? 'bg-emerald-900/50 text-emerald-300 border-l-2 border-emerald-500' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
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

          {/* Bottom Navigation */}
          <div className="border-t border-slate-700">
            {/* Account Section */}
            <div className={`${isCollapsed ? 'p-2' : 'p-3'}`}>
              {!isCollapsed && (
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Account
                </div>
              )}
              <div className="space-y-1">
                {bottomNavItems.filter(item => item.section === 'ACCOUNT').map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center rounded-md text-sm font-medium transition-colors
                      ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                      text-slate-300 hover:bg-slate-700 hover:text-white
                    `}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className={`${isCollapsed ? 'p-2' : 'p-3'}`}>
              {!isCollapsed && (
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Help
                </div>
              )}
              <div className="space-y-1">
                {bottomNavItems.filter(item => item.section === 'HELP').map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center rounded-md text-sm font-medium transition-colors
                      ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                      text-slate-300 hover:bg-slate-700 hover:text-white
                    `}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile Section */}
            <div className={`border-t border-slate-700 ${isCollapsed ? 'p-2' : 'p-3'}`}>
              <div className={`
                flex items-center rounded-md text-sm font-medium transition-colors
                ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                text-slate-300
              `}>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {getUserInitials()}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="flex-1">
                    <div className="text-sm font-medium truncate">{user?.name || 'User'}</div>
                  </div>
                )}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`
                  w-full flex items-center rounded-md text-sm font-medium transition-colors mt-2
                  ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
                  text-slate-300 hover:bg-slate-700 hover:text-white
                `}
              >
                <div className="flex-shrink-0">
                  <LogOut className="h-4 w-4" />
                </div>
                {!isCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

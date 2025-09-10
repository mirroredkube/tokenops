'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
  requireAll?: boolean // If true, user must have ALL roles; if false, user needs ANY role
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null, 
  requireAll = false 
}: RoleGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return <>{fallback}</>
  }

  const hasPermission = requireAll 
    ? allowedRoles.every(role => user.role === role)
    : allowedRoles.includes(user.role)

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

// Convenience components for common role checks
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function ComplianceOfficerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'COMPLIANCE_OFFICER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function IssuerAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'ISSUER_ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function ComplianceReviewerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'COMPLIANCE_OFFICER', 'COMPLIANCE_REVIEWER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function NotViewerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Hook for checking permissions
export function usePermissions() {
  const { user } = useAuth()

  const hasRole = (role: string) => user?.role === role

  const hasAnyRole = (roles: string[]) => roles.includes(user?.role || '')

  const hasAllRoles = (roles: string[]) => roles.every(role => user?.role === role)

  const canManageUsers = hasAnyRole(['ADMIN'])
  
  const canManageOrganization = hasAnyRole(['ADMIN'])
  
  const canCreateAssets = hasAnyRole(['ADMIN', 'ISSUER_ADMIN'])
  
  const canVerifyCompliance = hasAnyRole(['ADMIN', 'COMPLIANCE_OFFICER', 'COMPLIANCE_REVIEWER'])
  
  const canApproveCompliance = hasAnyRole(['ADMIN', 'COMPLIANCE_OFFICER'])
  
  const canManageIssuances = hasAnyRole(['ADMIN', 'ISSUER_ADMIN'])
  
  const canViewReports = hasAnyRole(['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'])
  
  const canExportData = hasAnyRole(['ADMIN', 'COMPLIANCE_OFFICER', 'ISSUER_ADMIN'])

  return {
    user,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canManageUsers,
    canManageOrganization,
    canCreateAssets,
    canVerifyCompliance,
    canApproveCompliance,
    canManageIssuances,
    canViewReports,
    canExportData
  }
}

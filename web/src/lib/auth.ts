// src/lib/auth.ts

export interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: "admin" | "user";
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    legalName?: string;
    country: string;
    jurisdiction?: string;
  };
}

export interface AuthSession {
  user: User | null;
}

import { getTenantApiUrl } from './tenantApi';

export async function loginWithGoogle(): Promise<void> {
  // Redirect to backend OAuth endpoint using tenant-aware URL
  window.location.href = `${getTenantApiUrl()}/auth/google`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${getTenantApiUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // Redirect to home page
  window.location.href = '/';
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${getTenantApiUrl()}/auth/me`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data: AuthSession = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

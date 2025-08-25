// src/lib/auth.ts

export interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: "admin" | "user";
}

export interface AuthSession {
  user: User | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function loginWithGoogle(): Promise<void> {
  // Redirect to backend OAuth endpoint
  window.location.href = `${API_BASE}/auth/google`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
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
    const response = await fetch(`${API_BASE}/auth/me`, {
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

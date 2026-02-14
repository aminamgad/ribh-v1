'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; maintenance?: boolean; user?: User }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First, try to load user from localStorage for faster initial render
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('ribh-user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            // Don't set loading to false yet, we still need to verify with server
          } catch (error) {
            // Invalid saved user, clear it
            localStorage.removeItem('ribh-user');
          }
        }
      }

      // Verify with server
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Save user to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('ribh-user', JSON.stringify(data.user));
        }
        // Clear cache when user is authenticated to ensure fresh data based on user role
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('ribh_data_cache');
          }
        } catch (error) {
          // Silently handle cache clearing errors
        }
      } else {
        // If server verification fails, clear saved user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ribh-user');
        }
        setUser(null);
      }
    } catch (error) {
      // If there's an error, clear saved user
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ribh-user');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // Save user to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('ribh-user', JSON.stringify(data.user));
        }
        // Clear cache when user logs in to ensure fresh data based on user role
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('ribh_data_cache');
          }
        } catch (error) {
          // Silently handle cache clearing errors
        }
        return { success: true, user: data.user };
      } else {
        // Check if it's a maintenance mode response
        if (data.maintenance || response.status === 503) {
          return { 
            success: false, 
            error: data.message || data.error || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.',
            maintenance: true 
          };
        }
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }
    } catch (error) {
      return { success: false, error: 'حدث خطأ في الاتصال' };
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // Save user to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('ribh-user', JSON.stringify(data.user));
        }
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'فشل التسجيل' };
      }
    } catch (error) {
      return { success: false, error: 'حدث خطأ في الاتصال' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Silently handle logout errors - still clear local state
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ribh-user');
        try {
          sessionStorage.removeItem('ribh_data_cache');
        } catch {
          // ignore
        }
      }
      // Redirect to login so re-login works without full page reload
      router.push('/login');
      router.refresh();
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      // Update saved user in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('ribh-user', JSON.stringify(updatedUser));
      }
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user && !loading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 
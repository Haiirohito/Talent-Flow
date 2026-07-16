import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../api/client';
import { canModifyUser as canModifyUserByRole } from '../utils/roleUtils';

export type UserRole = 'admin' | 'team_lead' | 'recruiter' | 'employee' | 'viewer';

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
}

export interface DashboardData {
  user_role: UserRole;
  user_name: string | null;
  user_email: string;
  permissions: string[];
  features: DashboardFeature[];
}

export interface DashboardFeature {
  key: string;
  label: string;
  description: string;
  icon: string | null;
}

interface AuthContextType {
  user: User | null;
  dashboard: DashboardData | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (...perms: string[]) => boolean;
  refreshUser: () => Promise<void>;
  /** Check if the current user can modify a user with the given role (mirrors backend). */
  canModifyUser: (targetRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    // Guard against concurrent fetchUser calls
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const [userData, dashData] = await Promise.all([
        fetchApi('/users/me'),
        fetchApi('/dashboard/'),
      ]);
      setUser(userData);
      setDashboard(dashData);
    } catch (error) {
      console.error('Failed to fetch user', error);
      localStorage.removeItem('access_token');
      setUser(null);
      setDashboard(null);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('access_token', token);
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    setUser(null);
    setDashboard(null);
  }, []);

  const permissions = dashboard?.permissions ?? [];

  const hasPermission = useCallback((perm: string) => permissions.includes(perm), [permissions]);
  const hasAnyPermission = useCallback((...perms: string[]) => perms.some(p => permissions.includes(p)), [permissions]);

  /** Check if the current user can modify a user with the given target role. */
  const canModifyUser = useCallback(
    (targetRole: UserRole) => {
      if (!user) return false;
      return canModifyUserByRole(user.role, targetRole);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{
      user,
      dashboard,
      permissions,
      isAuthenticated: !!user,
      login,
      logout,
      loading,
      hasPermission,
      hasAnyPermission,
      refreshUser: fetchUser,
      canModifyUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

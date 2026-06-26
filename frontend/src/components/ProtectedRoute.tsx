import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/**
 * Permission-gated route wrapper.
 * Redirects to /dashboard if the user lacks the required permission.
 */
export const PermissionRoute: React.FC<{ permission: string }> = ({ permission }) => {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return <div className="spinner">Loading…</div>;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

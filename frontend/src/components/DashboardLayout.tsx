import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  Home, Users, UserPlus, User, Briefcase, Ticket, 
  Shield, Mail, Settings, LogOut, Menu, X, RotateCcw, UserCheck
} from './icons';

const DashboardLayout: React.FC = () => {
  const { user, hasPermission, hasAnyPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '?';

  const roleName = user?.role?.replace('_', ' ') ?? 'User';

  // Permission checks for nav visibility
  const canViewUsers = hasPermission('users:read');
  const canInviteUsers = hasPermission('users:invite');
  const canViewAdmin = hasPermission('dashboard:admin');
  const canViewClients = hasPermission('clients:read');
  const canViewCandidates = hasPermission('candidates:read');
  const canViewTickets = hasPermission('tickets:read');
  const canApproveReopens = hasPermission('tickets:reopen_approve');
  const canManageTeam = hasPermission('team:manage');
  const canTestEmail = hasPermission('system:email_test');
  const canViewSettings = hasPermission('system:settings');

  return (
    <div className="dashboard-shell">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="slide-over-overlay" 
          onClick={() => setSidebarOpen(false)} 
          style={{ zIndex: 40 }} 
        />
      )}

      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
          <Menu />
        </button>
        <span className="top-header-title">TalentFlow</span>
      </div>

      {/* ── Sidebar ──────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={sidebarOpen ? { transform: 'translateX(0)' } : {}}>
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <div className="sidebar-brand-icon">
              <Ticket />
            </div>
            TalentFlow
          </NavLink>
          {sidebarOpen && (
            <button className="btn-icon" onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto' }}>
              <X />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Overview</span>

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Home />
            Dashboard
          </NavLink>

          {(canViewTickets || canApproveReopens || canManageTeam) && (
            <>
              <span className="sidebar-section-label">Hiring</span>
              {canViewTickets && (
                <NavLink
                  to="/tickets"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Ticket />
                  Tickets
                </NavLink>
              )}

              {canApproveReopens && (
                <NavLink
                  to="/reopen-requests"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <RotateCcw />
                  Reopen Requests
                </NavLink>
              )}

              {canManageTeam && (
                <NavLink
                  to="/my-team"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Users />
                  {user?.role === 'admin' ? 'Teams' : 'My Team'}
                </NavLink>
              )}
            </>
          )}

          {(canViewUsers || canInviteUsers) && (
            <>
              <span className="sidebar-section-label">People</span>
              {canViewUsers && (
                <NavLink
                  to="/users"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Users />
                  Users
                </NavLink>
              )}

              {canInviteUsers && (
                <NavLink
                  to="/invite"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <UserPlus />
                  Invite User
                </NavLink>
              )}
            </>
          )}

          {(canViewClients || canViewCandidates) && (
            <>
              <span className="sidebar-section-label">Relationships</span>
              {canViewClients && (
              <NavLink
                to="/clients"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Briefcase />
                Clients
              </NavLink>
              )}
              {canViewCandidates && (
              <NavLink
                to="/candidates"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <UserCheck />
                Candidates
              </NavLink>
              )}
            </>
          )}

          {/* Admin & System */}
          {hasAnyPermission('dashboard:admin', 'system:settings', 'system:email_test') && (
            <>
              <span className="sidebar-section-label">Administration</span>
              {canViewAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Shield />
                  Admin Panel
                </NavLink>
              )}
              {canViewSettings && (
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Settings />
                  Settings
                </NavLink>
              )}
              {canTestEmail && (
                <NavLink
                  to="/email-test"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Mail />
                  Email Testing
                </NavLink>
              )}
            </>
          )}

          {/* Account */}
          <span className="sidebar-section-label">Account</span>

          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <User />
            Profile
          </NavLink>

          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name || user?.email}</div>
              <div className="sidebar-user-role">{roleName}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ────────────────── */}
      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;

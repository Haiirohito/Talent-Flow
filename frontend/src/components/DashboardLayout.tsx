import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/* ── Inline SVG icons (18×18) ─────────────── */
const icons = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  userPlus: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  briefcase: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  ticket: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5.5A3.5 3.5 0 0 0 11.5 9h-3A3.5 3.5 0 0 0 5 12.5V16h14v-3.5a3.5 3.5 0 0 0-3.5-3.5h-3A3.5 3.5 0 0 0 9 5.5V2H15z" />
      <path d="M15 2v3.5a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 1 5 5.5V2"/>
      <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  mail: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const DashboardLayout: React.FC = () => {
  const { user, hasPermission, hasAnyPermission, logout } = useAuth();
  const navigate = useNavigate();

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
  const canViewTickets = hasPermission('tickets:read');
  const canTestEmail = hasPermission('system:email_test');
  const canViewSettings = hasPermission('system:settings');

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ──────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-brand">
            TalentFlow
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Overview</span>

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {icons.home}
            Dashboard
          </NavLink>

          {/* User Management — only if user has users:read */}
          {(canViewUsers || canViewClients || canViewTickets) && (
            <span className="sidebar-section-label">Management</span>
          )}

          {canViewUsers && (
            <NavLink
              to="/users"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {icons.users}
              Users
            </NavLink>
          )}

          {canViewClients && (
            <NavLink
              to="/clients"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {icons.briefcase}
              Clients
            </NavLink>
          )}

          {canViewTickets && (
            <NavLink
              to="/tickets"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {icons.ticket}
              Tickets
            </NavLink>
          )}

          {canInviteUsers && (
            <NavLink
              to="/invite"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {icons.userPlus}
              Invite User
            </NavLink>
          )}

          {/* Admin & System */}
          {hasAnyPermission('dashboard:admin', 'system:settings', 'system:email_test') && (
            <>
              <span className="sidebar-section-label">System</span>
              {canViewAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  {icons.shield}
                  Admin Panel
                </NavLink>
              )}
              {canViewSettings && (
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  {icons.settings}
                  Settings
                </NavLink>
              )}
              {canTestEmail && (
                <NavLink
                  to="/email-test"
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  {icons.mail}
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
          >
            {icons.user}
            Profile
          </NavLink>

          <button className="sidebar-link" onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', font: 'inherit' }}>
            {icons.logout}
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

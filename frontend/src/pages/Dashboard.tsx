import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

/* Simple icon map — maps backend icon strings to inline SVGs */
const featureIcons: Record<string, JSX.Element> = {
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
  'user-plus': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  briefcase: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  mail: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
};

const defaultIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </svg>
);

/* Feature key → route mapping for clickable cards */
const featureRoutes: Record<string, string> = {
  admin_panel: '/admin',
  user_management: '/users',
  invite_users: '/invite',
  my_profile: '/profile',
  system_settings: '/settings',
  email_testing: '/email-test',
};

const Dashboard: React.FC = () => {
  const { user, dashboard, permissions } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Dashboard</span>
        <div className="top-header-actions">
          <span className="text-secondary">{user?.email}</span>
        </div>
      </header>

      <div className="page-content">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <h2>Welcome back, {user?.full_name || user?.email}!</h2>
          <p>Here's what's available for your role in TalentFlow.</p>
          <span className="badge" style={{ marginTop: 12 }}>
            {dashboard?.user_role?.replace('_', ' ') ?? 'User'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Your Role</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', textTransform: 'capitalize' }}>
              {dashboard?.user_role?.replace('_', ' ') ?? '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Permissions</div>
            <div className="stat-value">{permissions.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Features</div>
            <div className="stat-value">{dashboard?.features?.length ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)' }}>
              Active
            </div>
          </div>
        </div>

        {/* Feature Cards — clickable where route exists */}
        <div className="section-label">Available Features</div>
        <div className="features-grid">
          {dashboard?.features?.map((feature) => {
            const route = featureRoutes[feature.key];
            return (
              <div
                className="feature-card"
                key={feature.key}
                style={{ cursor: route ? 'pointer' : 'default' }}
                onClick={() => route && navigate(route)}
              >
                <div className="feature-icon">
                  {feature.icon && featureIcons[feature.icon]
                    ? featureIcons[feature.icon]
                    : defaultIcon}
                </div>
                <div className="feature-label">{feature.label}</div>
                <div className="feature-desc">{feature.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Dashboard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { 
  Shield, Users, UserPlus, Briefcase, Search, User, 
  Settings, Mail, LayoutGrid
} from '../components/icons';

/* Simple icon map — maps backend icon strings to Lucide components */
const featureIcons: Record<string, React.ReactNode> = {
  shield: <Shield />,
  users: <Users />,
  'user-plus': <UserPlus />,
  briefcase: <Briefcase />,
  search: <Search />,
  user: <User />,
  settings: <Settings />,
  mail: <Mail />,
};

const defaultIcon = <LayoutGrid />;

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
        <div className="welcome-banner animate-fadeInUp">
          <h2>{getGreeting()}, {user?.full_name || user?.email?.split('@')[0]}!</h2>
          <p>Here's what's available for your role in TalentFlow.</p>
          <span className="badge">
            {dashboard?.user_role?.replace('_', ' ') ?? 'User'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">Your Role</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', textTransform: 'capitalize' }}>
              {dashboard?.user_role?.replace('_', ' ') ?? '—'}
            </div>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">Permissions</div>
            <div className="stat-value">{permissions.length}</div>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.3s' }}>
            <div className="stat-label">Features</div>
            <div className="stat-value">{dashboard?.features?.length ?? 0}</div>
          </div>
          <div className="stat-card" style={{ animationDelay: '0.4s' }}>
            <div className="stat-label">System Status</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot status-dot-online"></span>
              Online
            </div>
          </div>
        </div>

        {/* Feature Cards — clickable where route exists */}
        <div className="section-label" style={{ marginTop: '32px' }}>Available Features</div>
        <div className="features-grid">
          {dashboard?.features?.map((feature, idx) => {
            const route = featureRoutes[feature.key];
            return (
              <div
                className="feature-card animate-fadeInUp"
                key={feature.key}
                style={{ cursor: route ? 'pointer' : 'default', animationDelay: `${0.1 * (idx + 1)}s` }}
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

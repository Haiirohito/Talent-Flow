import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PriorityIndicator from '../components/PriorityIndicator';
import { STAGE_ORDER } from '../components/StagePipeline';
import {
  Shield, Users, UserPlus, Briefcase, Search, User,
  Settings, Mail, LayoutGrid, Ticket, Plus, RotateCcw
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

interface DashboardStatsData {
  total_tickets: number;
  active_tickets: number;
  closed_tickets: number;
  on_hold_tickets: number;
  cancelled_tickets: number;
  total_clients: number;
  active_clients: number;
  total_users: number;
  team_size: number;
  pending_reopen_requests: number;
  recent_tickets: {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    current_stage: string;
    created_at: string | null;
  }[];
}

const getStageName = (stageKey: string) => {
  return (
    STAGE_ORDER.find((s) => s.key === stageKey)?.label ||
    stageKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

const Dashboard: React.FC = () => {
  const { user, dashboard, permissions, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi('/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const role = user?.role ?? 'viewer';

  // Quick action definitions based on role
  const quickActions: { label: string; icon: React.ReactNode; route: string; perm?: string }[] = [
    { label: 'View Tickets', icon: <Ticket />, route: '/tickets', perm: 'tickets:read' },
    { label: 'New Ticket', icon: <Plus />, route: '/tickets', perm: 'tickets:create' },
    { label: 'Manage Clients', icon: <Briefcase />, route: '/clients', perm: 'clients:read' },
    { label: 'My Team', icon: <Users />, route: '/my-team', perm: 'team:manage' },
    { label: 'Reopen Requests', icon: <RotateCcw />, route: '/reopen-requests', perm: 'tickets:reopen_approve' },
    { label: 'Invite User', icon: <UserPlus />, route: '/invite', perm: 'users:invite' },
  ].filter(a => !a.perm || hasPermission(a.perm));

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
          <p>
            {role === 'admin'
              ? 'Here\'s a system-wide overview of TalentFlow.'
              : role === 'team_lead'
                ? 'Here\'s an overview of your tickets and team.'
                : role === 'recruiter'
                  ? 'Here are the tickets assigned to you.'
                  : 'Welcome to TalentFlow.'}
          </p>
          <span className="badge">
            {dashboard?.user_role?.replace('_', ' ') ?? 'User'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">
              {role === 'recruiter' ? 'Assigned Tickets' : role === 'team_lead' ? 'My Tickets' : 'Total Tickets'}
            </div>
            <div className="stat-value">
              {statsLoading ? '—' : stats?.total_tickets ?? 0}
            </div>
            {stats && stats.active_tickets > 0 && (
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                {stats.active_tickets} active
              </div>
            )}
          </div>

          <div className="stat-card" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">Active Clients</div>
            <div className="stat-value">
              {statsLoading ? '—' : stats?.active_clients ?? 0}
            </div>
            {stats && stats.total_clients !== stats.active_clients && (
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                {stats.total_clients} total
              </div>
            )}
          </div>

          {(role === 'admin' || role === 'team_lead') && (
            <div className="stat-card" style={{ animationDelay: '0.3s' }}>
              <div className="stat-label">
                {role === 'admin' ? 'Total Team Members' : 'My Team'}
              </div>
              <div className="stat-value">
                {statsLoading ? '—' : stats?.team_size ?? 0}
              </div>
              {role === 'admin' && stats && stats.total_users > 0 && (
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  {stats.total_users} users total
                </div>
              )}
            </div>
          )}

          {(role === 'admin' || role === 'team_lead') && (
            <div className="stat-card" style={{ animationDelay: '0.4s' }}>
              <div className="stat-label">Pending Reopens</div>
              <div className="stat-value" style={{
                color: (stats?.pending_reopen_requests ?? 0) > 0 ? 'var(--color-warning)' : 'var(--color-success)'
              }}>
                {statsLoading ? '—' : stats?.pending_reopen_requests ?? 0}
              </div>
            </div>
          )}

          <div className="stat-card" style={{ animationDelay: '0.3s' }}>
            <div className="stat-label">On Hold Tickets</div>
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
              {statsLoading ? '—' : stats?.on_hold_tickets ?? 0}
            </div>
          </div>

          <div className="stat-card" style={{ animationDelay: '0.35s' }}>
            <div className="stat-label">Cancelled Tickets</div>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
              {statsLoading ? '—' : stats?.cancelled_tickets ?? 0}
            </div>
          </div>

          {(role === 'admin') && (
            <div className="stat-card" style={{ animationDelay: '0.5s' }}>
              <div className="stat-label">System Status</div>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-online"></span>
                Online
              </div>
            </div>
          )}
        </div>

        {/* Ticket Status Breakdown */}
        {stats && stats.total_tickets > 0 && (
          <div className="card animate-fadeInUp" style={{ marginTop: 24 }}>
            <div className="card-header">
              <span className="card-title">Ticket Breakdown</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '0 0 8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--color-success)'
                }} />
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                  Active: <strong>{stats.active_tickets}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--color-warning)'
                }} />
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                  On Hold: <strong>{stats.on_hold_tickets}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--color-primary)'
                }} />
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                  Closed: <strong>{stats.closed_tickets}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--color-danger)'
                }} />
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                  Cancelled: <strong>{stats.cancelled_tickets}</strong>
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{
              display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden',
              background: 'var(--color-surface-hover)'
            }}>
              {stats.active_tickets > 0 && (
                <div style={{
                  width: `${(stats.active_tickets / stats.total_tickets) * 100}%`,
                  background: 'var(--color-success)',
                  transition: 'width 0.5s ease'
                }} />
              )}
              {stats.on_hold_tickets > 0 && (
                <div style={{
                  width: `${(stats.on_hold_tickets / stats.total_tickets) * 100}%`,
                  background: 'var(--color-warning)',
                  transition: 'width 0.5s ease'
                }} />
              )}
              {stats.closed_tickets > 0 && (
                <div style={{
                  width: `${(stats.closed_tickets / stats.total_tickets) * 100}%`,
                  background: 'var(--color-primary)',
                  transition: 'width 0.5s ease'
                }} />
              )}
              {stats.cancelled_tickets > 0 && (
                <div style={{
                  width: `${(stats.cancelled_tickets / stats.total_tickets) * 100}%`,
                  background: 'var(--color-danger)',
                  transition: 'width 0.5s ease'
                }} />
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: '32px' }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {quickActions.map((action, idx) => (
                <button
                  key={action.label}
                  className="btn btn-outline animate-fadeInUp"
                  style={{ animationDelay: `${0.05 * (idx + 1)}s`, display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => navigate(action.route)}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recent Tickets */}
        {stats && stats.recent_tickets.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: '32px' }}>Recent Tickets</div>
            <div className="table-card animate-fadeInUp">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Stage</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="row-clickable"
                        onClick={() => navigate('/tickets')}
                      >
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{t.title}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                            {t.ticket_number}
                          </div>
                        </td>
                        <td>
                          <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                            {getStageName(t.current_stage)}
                          </span>
                        </td>
                        <td>
                          <PriorityIndicator priority={t.priority} readonly />
                        </td>
                        <td>
                          <StatusBadge type="ticket-status" value={t.status} />
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

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

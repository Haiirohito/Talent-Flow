import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import type { User } from '../components/AuthContext';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
    'profile:read', 'profile:update', 'profile:delete',
    'dashboard:admin', 'dashboard:hr', 'dashboard:recruitment', 'dashboard:employee',
    'system:settings', 'system:email_test',
  ],
  hr_manager: [
    'users:read', 'users:create', 'users:update', 'users:invite',
    'profile:read', 'profile:update',
    'dashboard:hr', 'dashboard:employee',
  ],
  recruiter: [
    'users:read',
    'profile:read', 'profile:update',
    'dashboard:recruitment', 'dashboard:employee',
  ],
  employee: [
    'profile:read', 'profile:update', 'profile:delete',
    'dashboard:employee',
  ],
  viewer: [
    'profile:read',
    'dashboard:employee',
  ],
};

const ALL_PERMISSIONS = [
  'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
  'profile:read', 'profile:update', 'profile:delete',
  'dashboard:admin', 'dashboard:hr', 'dashboard:recruitment', 'dashboard:employee',
  'system:settings', 'system:email_test',
];

const ALL_ROLES = ['admin', 'hr_manager', 'recruiter', 'employee', 'viewer'];

const AdminPanel: React.FC = () => {
  const { user, permissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, health] = await Promise.all([
          fetchApi('/users/'),
          fetchApi('/utils/health-check/'),
        ]);
        setUsers(usersData.data || usersData);
        setHealthOk(!!health);
      } catch {
        setHealthOk(false);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const roleCounts = ALL_ROLES.reduce((acc, role) => {
    acc[role] = users.filter((u: any) => u.role === role).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  if (loading) {
    return (
      <>
        <header className="top-header"><span className="top-header-title">Admin Panel</span></header>
        <div className="page-content"><div className="spinner">Loading…</div></div>
      </>
    );
  }

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Admin Panel</span>
        <div className="top-header-actions">
          <span className="flex-gap">
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: healthOk ? 'var(--color-success)' : 'var(--color-danger)',
              display: 'inline-block',
            }} />
            <span className="text-secondary">{healthOk ? 'System Healthy' : 'System Error'}</span>
          </span>
        </div>
      </header>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inactive</div>
            <div className="stat-value" style={{ color: inactiveCount > 0 ? 'var(--color-danger)' : undefined }}>{inactiveCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Your Permissions</div>
            <div className="stat-value">{permissions.length}</div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Users by Role</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {ALL_ROLES.map(role => (
              <div key={role} style={{
                flex: '1 1 140px',
                padding: '14px 18px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{roleCounts[role] || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                  {role.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Role-Permission Matrix</span>
          </div>
          <div className="table-wrapper">
            <table className="table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Permission</th>
                  {ALL_ROLES.map(r => (
                    <th key={r} style={{ textTransform: 'capitalize', textAlign: 'center' }}>
                      {r.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map(perm => (
                  <tr key={perm}>
                    <td>
                      <code style={{
                        background: 'var(--color-bg)', padding: '2px 8px',
                        borderRadius: 4, fontSize: '0.6875rem',
                      }}>
                        {perm}
                      </code>
                    </td>
                    {ALL_ROLES.map(role => (
                      <td key={role} style={{ textAlign: 'center' }}>
                        {ROLE_PERMISSIONS[role]?.includes(perm) ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Current User Info */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Your Session</span>
          </div>
          <div className="grid-2">
            <div>
              <div className="form-group">
                <span className="form-label">Email</span>
                <span className="text-secondary">{user?.email}</span>
              </div>
              <div className="form-group">
                <span className="form-label">Role</span>
                <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div>
              <div className="form-group">
                <span className="form-label">User ID</span>
                <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{user?.id}</span>
              </div>
              <div className="form-group">
                <span className="form-label">Active Permissions</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {permissions.map(p => (
                    <code key={p} style={{
                      background: 'var(--color-primary-soft)', color: 'var(--color-primary)',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.6875rem',
                    }}>
                      {p}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;

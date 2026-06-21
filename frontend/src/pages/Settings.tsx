import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';

const Settings: React.FC = () => {
  const { user, permissions } = useAuth();
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await fetchApi('/utils/health-check/');
        setHealthOk(!!result);
      } catch {
        setHealthOk(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">System Settings</span>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : (
          <>
            {/* System Health */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title">System Health</span>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">API Status</div>
                  <div className="flex-gap" style={{ marginTop: 4 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: healthOk ? 'var(--color-success)' : 'var(--color-danger)',
                      display: 'inline-block',
                    }} />
                    <span style={{ fontWeight: 600, color: healthOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {healthOk ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">API Endpoint</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', marginTop: 6 }}>
                    http://localhost:8000/api/v1
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Frontend</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', marginTop: 6 }}>
                    http://localhost:5173
                  </div>
                </div>
              </div>
            </div>

            {/* Current Session */}
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Current User</span>
                </div>
                <div className="form-group">
                  <span className="form-label">Email</span>
                  <span>{user?.email}</span>
                </div>
                <div className="form-group">
                  <span className="form-label">Name</span>
                  <span>{user?.full_name || '—'}</span>
                </div>
                <div className="form-group">
                  <span className="form-label">Role</span>
                  <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="form-group">
                  <span className="form-label">User ID</span>
                  <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {user?.id}
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Active Permissions ({permissions.length})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {permissions.map(p => (
                    <code key={p} style={{
                      background: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}>
                      {p}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Settings;

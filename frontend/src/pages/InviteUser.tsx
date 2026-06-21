import React, { useState } from 'react';
import { fetchApi } from '../api/client';
import type { UserRole } from '../components/AuthContext';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hr_manager', label: 'HR Manager' },
];

const InviteUser: React.FC = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ email: string; invitation_link: string; role: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSending(true);

    try {
      const data = await fetchApi('/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setResult(data);
      setEmail('');
      setRole('employee');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Invite User</span>
      </header>

      <div className="page-content">
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Send Invitation</span>
            </div>
            <p className="text-secondary" style={{ marginBottom: 20 }}>
              Send an invitation link to a new team member. They'll be able to register with the assigned role.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-email">Email Address</label>
                <input
                  id="invite-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="newuser@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invite-role">Assign Role</label>
                <select
                  id="invite-role"
                  className="form-input"
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send Invitation'}
              </button>
            </form>
          </div>

          {/* Success — show invitation link */}
          {result && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <span className="card-title">Invitation Sent</span>
              </div>
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                Invitation sent to <strong>{result.email}</strong> with role <strong>{result.role.replace('_', ' ')}</strong>.
              </div>
              <div className="form-group">
                <label className="form-label">Invitation Link</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={result.invitation_link}
                    readOnly
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.invitation_link);
                    }}
                  >
                    Copy
                  </button>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  Share this link with the user. If email is configured, it was also sent to their inbox.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InviteUser;

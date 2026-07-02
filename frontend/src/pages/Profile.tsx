import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../api/client';

const Profile: React.FC = () => {
  const { user, login, logout, hasPermission, permissions } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  const canUpdate = hasPermission('profile:update');
  const canDelete = hasPermission('profile:delete');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await fetchApi('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName, email }),
      });
      setMessage('Profile updated successfully');
      const token = localStorage.getItem('access_token');
      if (token) login(token);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');

    try {
      await fetchApi('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPwdMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await fetchApi('/users/me', { method: 'DELETE' });
      logout();
      navigate('/login');
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Profile</span>
        <div className="top-header-actions">
          <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </header>

      <div className="page-content">
        {/* Profile Info Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Account Overview</span>
          </div>
          <div className="grid-2">
            <div>
              <div className="form-group">
                <span className="form-label">Full Name</span>
                <span>{user?.full_name || '—'}</span>
              </div>
              <div className="form-group">
                <span className="form-label">Email</span>
                <span>{user?.email}</span>
              </div>
            </div>
            <div>
              <div className="form-group">
                <span className="form-label">Role</span>
                <span style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span>
              </div>
              <div className="form-group">
                <span className="form-label">Status</span>
                <span className={`badge ${user?.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Edit Personal Information */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Personal Information</span>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={!canUpdate}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!canUpdate}
                />
              </div>
              {canUpdate && (
                <button type="submit" className="btn btn-primary btn-block">
                  Save Changes
                </button>
              )}
              {!canUpdate && (
                <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: 8 }}>
                  You don't have permission to edit your profile.
                </p>
              )}
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Change Password</span>
            </div>

            {pwdMessage && <div className="alert alert-success">{pwdMessage}</div>}
            {pwdError && <div className="alert alert-error">{pwdError}</div>}

            <form onSubmit={handleUpdatePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="current-password">Current Password</label>
                <input
                  id="current-password"
                  className="form-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={!canUpdate}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!canUpdate}
                />
              </div>
              {canUpdate && (
                <button type="submit" className="btn btn-primary btn-block">
                  Update Password
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Permissions Display */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Your Permissions</span>
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

        {/* Danger Zone */}
        {canDelete && (
          <div className="card" style={{ marginTop: 20, borderColor: 'var(--color-danger)', borderWidth: 1 }}>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--color-danger)' }}>Danger Zone</span>
            </div>
            <p className="text-secondary" style={{ marginBottom: 16, fontSize: '0.875rem' }}>
              Once you delete your account, there is no going back. This will permanently remove your data.
            </p>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>
              Delete My Account
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Profile;

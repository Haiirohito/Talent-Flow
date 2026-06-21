import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import type { User, UserRole } from '../components/AuthContext';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'employee', label: 'Employee' },
  { value: 'viewer', label: 'Viewer' },
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, hasPermission } = useAuth();

  // Create user form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'employee' as UserRole });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit user state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', full_name: '', role: 'employee' as UserRole, is_active: true });
  const [editError, setEditError] = useState('');

  const canCreate = hasPermission('users:create');
  const canUpdate = hasPermission('users:update');
  const canDelete = hasPermission('users:delete');

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/users/');
      setUsers(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ── Create User ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await fetchApi('/users/', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreate(false);
      setCreateForm({ email: '', password: '', full_name: '', role: 'employee' });
      setSuccess('User created successfully');
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit User ──
  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditForm({ email: u.email, full_name: u.full_name || '', role: u.role, is_active: u.is_active });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      await fetchApi(`/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      setSuccess('User updated successfully');
      loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  // ── Delete User ──
  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetchApi(`/users/${userId}`, { method: 'DELETE' });
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // Clear success message after timeout
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (loading) {
    return (
      <>
        <header className="top-header">
          <span className="top-header-title">Users</span>
        </header>
        <div className="page-content"><div className="spinner">Loading…</div></div>
      </>
    );
  }

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">User Management</span>
        <div className="top-header-actions">
          <span className="text-secondary">{users.length} user{users.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : '+ New User'}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* ── Create User Form ── */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Create New User</span>
            </div>
            {createError && <div className="alert alert-error">{createError}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={createForm.full_name}
                    onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    minLength={8}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create User'}
              </button>
            </form>
          </div>
        )}

        {/* ── Edit User Modal/Inline ── */}
        {editingId && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Edit User</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
            {editError && <div className="alert alert-error">{editError}</div>}
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={editForm.full_name}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </form>
          </div>
        )}

        {/* ── Users Table ── */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">All Users</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.full_name || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role?.replace('_', ' ') || 'employee'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td>
                        <div className="flex-gap">
                          {canUpdate && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => startEdit(u)}
                              disabled={editingId === u.id}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(u.id)}
                              disabled={u.id === user?.id}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={(canUpdate || canDelete) ? 6 : 5}>
                      <div className="empty-state">No users found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Users;

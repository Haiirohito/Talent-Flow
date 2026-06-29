import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import SlideOver from '../components/SlideOver';

interface Client {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { hasPermission } = useAuth();

  // Create client form state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    company_name: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit client state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company_name: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
    is_active: true,
  });
  const [editError, setEditError] = useState('');

  const canCreate = hasPermission('clients:create');
  const canUpdate = hasPermission('clients:update');
  const canDelete = hasPermission('clients:delete');

  const loadClients = async () => {
    try {
      const data = await fetchApi('/clients/');
      setClients(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // ── Create Client ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await fetchApi('/clients/', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          company_name: createForm.company_name || null,
          phone: createForm.phone || null,
          address: createForm.address || null,
          website: createForm.website || null,
          notes: createForm.notes || null,
        }),
      });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', company_name: '', phone: '', address: '', website: '', notes: '' });
      setSuccess('Client created successfully');
      loadClients();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Client ──
  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      email: c.email,
      company_name: c.company_name || '',
      phone: c.phone || '',
      address: c.address || '',
      website: c.website || '',
      notes: c.notes || '',
      is_active: c.is_active,
    });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      await fetchApi(`/clients/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          company_name: editForm.company_name || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          website: editForm.website || null,
          notes: editForm.notes || null,
        }),
      });
      setEditingId(null);
      setSuccess('Client updated successfully');
      loadClients();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update client');
    }
  };

  // ── Delete Client ──
  const handleDelete = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await fetchApi(`/clients/${clientId}`, { method: 'DELETE' });
      setSuccess('Client deleted successfully');
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
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
          <span className="top-header-title">Clients</span>
        </header>
        <div className="page-content"><div className="spinner">Loading…</div></div>
      </>
    );
  }

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Client Management</span>
        <div className="top-header-actions">
          <span className="text-secondary">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : '+ New Client'}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* ── Create Client Form ── */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Create New Client</span>
            </div>
            {createError && <div className="alert alert-error">{createError}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Client name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="client@example.com"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    value={createForm.company_name}
                    onChange={e => setCreateForm({ ...createForm, company_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    className="form-input"
                    value={createForm.website}
                    onChange={e => setCreateForm({ ...createForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    className="form-input"
                    value={createForm.address}
                    onChange={e => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="123 Main St, City"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Additional notes about this client…"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create Client'}
              </button>
            </form>
          </div>
        )}

        {/* ── Edit Client Form ── */}
        {editingId && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Edit Client</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
            {editError && <div className="alert alert-error">{editError}</div>}
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
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
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    value={editForm.company_name}
                    onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    className="form-input"
                    value={editForm.website}
                    onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    className="form-input"
                    value={editForm.address}
                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
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

        {/* ── Clients Table ── */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">All Clients</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((c: Client) => (
                  <tr key={c.id} className="row-clickable" onClick={() => setSelectedClient(c)}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.company_name || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex-gap">
                          {canUpdate && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                              disabled={editingId === c.id}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={(canUpdate || canDelete) ? 7 : 6}>
                      <div className="empty-state">No clients found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SlideOver
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient ? selectedClient.name : ''}
      >
        {selectedClient && (
          <div>
            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Email</span>
                <div className="glance-value">
                  <a href={`mailto:${selectedClient.email}`} style={{ color: 'var(--color-primary)' }}>
                    {selectedClient.email}
                  </a>
                </div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Phone</span>
                <div className="glance-value">{selectedClient.phone || '—'}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Company</span>
                <div className="glance-value">{selectedClient.company_name || '—'}</div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Status</span>
                <span className={`badge ${selectedClient.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {selectedClient.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Website</span>
              <div className="glance-value">
                {selectedClient.website ? (
                  <a href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                    {selectedClient.website}
                  </a>
                ) : '—'}
              </div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Address</span>
              <div className="glance-value">{selectedClient.address || '—'}</div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Notes</span>
              {selectedClient.notes ? (
                <div className="glance-description">{selectedClient.notes}</div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No notes provided.</div>
              )}
            </div>

            <div className="glance-section">
              <span className="glance-label">Created At</span>
              <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                {selectedClient.created_at ? new Date(selectedClient.created_at).toLocaleString() : '—'}
              </div>
            </div>
            <div className="glance-section">
              <span className="glance-label">Last Updated</span>
              <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                {selectedClient.updated_at ? new Date(selectedClient.updated_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </>
  );
};

export default Clients;

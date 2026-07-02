import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import SlideOver from '../components/SlideOver';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Briefcase, Plus } from '../components/icons';

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
  const { hasPermission } = useAuth();
  const toast = useToast();

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

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    clientId: string | null;
  }>({ isOpen: false, clientId: null });

  const canCreate = hasPermission('clients:create');
  const canUpdate = hasPermission('clients:update');
  const canDelete = hasPermission('clients:delete');

  const loadClients = async () => {
    try {
      const data = await fetchApi('/clients/');
      setClients(data.data || data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create Client ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Client created successfully');
      loadClients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
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
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Client updated successfully');
      loadClients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update client');
    }
  };

  // ── Delete Client ──
  const executeDelete = async () => {
    const { clientId } = confirmState;
    if (!clientId) return;

    try {
      await fetchApi(`/clients/${clientId}`, { method: 'DELETE' });
      toast.success('Client deleted successfully');
      loadClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    } finally {
      setConfirmState({ isOpen: false, clientId: null });
    }
  };

  if (loading) {
    return (
      <>
        <header className="top-header">
          <span className="top-header-title">Clients</span>
        </header>
        <div className="page-content">
          <div className="empty-state">
            <div className="spinner-icon" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '16px' }}>⟳</div>
            <div>Loading clients...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-brand-icon">
            <Briefcase />
          </div>
          <span className="top-header-title">Client Management</span>
        </div>
        <div className="top-header-actions">
          <span className="text-secondary">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : <><Plus /> New Client</>}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {/* ── Create Client Form ── */}
        {showCreate && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Create New Client</span>
            </div>
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Edit Client Form ── */}
        {editingId && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24, borderLeft: '4px solid var(--color-primary)' }}>
            <div className="card-header">
              <span className="card-title">Edit Client</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    required
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Clients Table ── */}
        <div className="table-card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Added</th>
                  {(canUpdate || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((c: Client) => (
                  <tr key={c.id} className="row-clickable animate-fadeInUp" onClick={() => setSelectedClient(c)}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{c.name}</div>
                      {c.company_name && (
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                          {c.company_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-text)' }}>{c.email}</div>
                      {c.phone && (
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge type="active" value={c.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-muted">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
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
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setConfirmState({ isOpen: true, clientId: c.id });
                              }}
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
                    <td colSpan={(canUpdate || canDelete) ? 5 : 4}>
                      <EmptyState 
                        title="No clients found" 
                        description="There are currently no clients in the system."
                        action={canCreate ? (
                          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            Create Client
                          </button>
                        ) : undefined}
                      />
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
        variant="wide"
      >
        {selectedClient && (
          <div className="ticket-details-slideover">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>{selectedClient.name}</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedClient.company_name && (
                  <>
                    <span className="text-secondary" style={{ fontWeight: 500 }}>{selectedClient.company_name}</span>
                    <span className="text-muted">•</span>
                  </>
                )}
                <StatusBadge type="active" value={selectedClient.is_active ? 'active' : 'inactive'} />
              </div>
            </div>

            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Email</span>
                <div className="glance-value">
                  <a href={`mailto:${selectedClient.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
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
                <span className="glance-label">Website</span>
                <div className="glance-value">
                  {selectedClient.website ? (
                    <a href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                      {selectedClient.website}
                    </a>
                  ) : '—'}
                </div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Address</span>
                <div className="glance-value">{selectedClient.address || '—'}</div>
              </div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Notes</span>
              {selectedClient.notes ? (
                <div className="glance-description" style={{ whiteSpace: 'pre-wrap' }}>{selectedClient.notes}</div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No notes provided.</div>
              )}
            </div>
            
            <div className="grid-2">
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
            
            {(canUpdate || canDelete) && (
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                 {canUpdate && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => {
                        setSelectedClient(null);
                        startEdit(selectedClient);
                      }}
                    >
                      Edit Client
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => setConfirmState({ isOpen: true, clientId: selectedClient.id })}
                    >
                      Delete Client
                    </button>
                  )}
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, clientId: null })}
        onConfirm={executeDelete}
        title="Delete Client"
        description="Are you sure you want to permanently delete this client? This action cannot be undone."
        confirmText="Delete Client"
        variant="danger"
      />
    </>
  );
};

export default Clients;

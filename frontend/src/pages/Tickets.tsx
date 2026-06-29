import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import SlideOver from '../components/SlideOver';

interface Client {
  id: string;
  name: string;
  company_name: string | null;
}

interface Ticket {
  id: string;
  ticket_number: string;
  client_id: string;
  title: string;
  description: string | null;
  vacancies: number;
  priority: string;
  current_stage: string;
  status: string;
  created_at: string | null;
  valid_next_stages?: string[];
}

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { hasPermission } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    vacancies: 1,
    priority: 'default',
    client_id: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const canCreate = hasPermission('tickets:create');
  const canUpdate = hasPermission('tickets:update');
  const canDelete = hasPermission('tickets:delete');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, clientsData] = await Promise.all([
        fetchApi('/tickets/'),
        fetchApi('/clients/'),
      ]);
      
      // For each ticket, fetch its details to get valid transitions (since list API doesn't return them)
      const ticketsList = ticketsData.data || ticketsData;
      const enrichedTickets = await Promise.all(
        ticketsList.map((t: Ticket) => fetchApi(`/tickets/${t.id}`).catch(() => t))
      );
      
      setTickets(enrichedTickets);
      setClients(clientsData.data || clientsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await fetchApi('/tickets/', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', vacancies: 1, priority: 'default', client_id: '' });
      setSuccess('Ticket created successfully');
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleStageTransition = async (ticketId: string, targetStage: string) => {
    try {
      await fetchApi(`/tickets/${ticketId}/transition-stage`, {
        method: 'POST',
        body: JSON.stringify({ target_stage: targetStage }),
      });
      setSuccess('Ticket stage updated');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket stage');
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      await fetchApi(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority }),
      });
      setSuccess('Ticket priority updated');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update priority');
    }
  };

  const handleClose = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    try {
      await fetchApi(`/tickets/${ticketId}/close`, { method: 'POST' });
      setSuccess('Ticket closed');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to close ticket');
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await fetchApi(`/tickets/${ticketId}`, { method: 'DELETE' });
      setSuccess('Ticket deleted');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ticket');
    }
  };

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.company_name || client.name) : 'Unknown Client';
  };

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <>
        <header className="top-header"><span className="top-header-title">Tickets</span></header>
        <div className="page-content"><div className="spinner">Loading…</div></div>
      </>
    );
  }

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Requirement Tickets</span>
        <div className="top-header-actions">
          <span className="text-secondary">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : '+ New Ticket'}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {showCreate && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Create New Ticket</span>
            </div>
            {createError && <div className="alert alert-error">{createError}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select
                    className="form-input"
                    value={createForm.client_id}
                    onChange={e => setCreateForm({ ...createForm, client_id: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    className="form-input"
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g. Senior Frontend Engineer"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vacancies *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={createForm.vacancies}
                    onChange={e => setCreateForm({ ...createForm, vacancies: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select
                    className="form-input"
                    value={createForm.priority}
                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="default">Default</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Job requirements and details…"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create Ticket'}
              </button>
            </form>
          </div>
        )}

        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">All Tickets</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket No.</th>
                  <th>Client</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Stage</th>
                  <th>Status</th>
                  {(canUpdate || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="row-clickable" onClick={() => setSelectedTicket(t)}>
                    <td><span className="text-muted">{t.ticket_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{getClientName(t.client_id)}</td>
                    <td>{t.title} <span className="text-muted">({t.vacancies})</span></td>
                    <td>
                      {canUpdate && t.status !== 'closed' && t.status !== 'cancelled' ? (
                        <select
                          className={`badge badge-priority-${t.priority}`}
                          style={{
                            appearance: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            paddingRight: '20px',
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23000\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            backgroundSize: '10px'
                          }}
                          value={t.priority}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => { e.stopPropagation(); handlePriorityChange(t.id, e.target.value); }}
                        >
                          <option value="low">LOW</option>
                          <option value="default">DEFAULT</option>
                          <option value="medium">MEDIUM</option>
                          <option value="high">HIGH</option>
                        </select>
                      ) : (
                        <span className={`badge badge-priority-${t.priority}`}>
                          {t.priority.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${t.current_stage === 'closed' || t.current_stage === 'joined' ? 'badge-stage-success' : 'badge-stage'}`}>
                          {formatStage(t.current_stage)}
                        </span>
                        {canUpdate && t.status !== 'closed' && t.status !== 'cancelled' && t.valid_next_stages && t.valid_next_stages.length > 0 && (
                          <select 
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '4px 24px 4px 8px', borderRadius: 6, backgroundSize: '12px' }}
                            value=""
                            onClick={e => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); handleStageTransition(t.id, e.target.value); }}
                          >
                            <option value="" disabled>Transition…</option>
                            {t.valid_next_stages.map(stage => (
                              <option key={stage} value={stage}>{formatStage(stage)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'active' ? 'badge-active' : t.status === 'closed' ? 'badge-inactive' : 'badge-user'}`}>
                        {t.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex-gap">
                          {canUpdate && t.status !== 'closed' && (
                            <button className="btn btn-outline btn-sm" onClick={() => handleClose(t.id)}>
                              Close
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={(canUpdate || canDelete) ? 7 : 6}>
                      <div className="empty-state">No tickets found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SlideOver
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `${selectedTicket.ticket_number} - ${selectedTicket.title}` : ''}
      >
        {selectedTicket && (
          <div>
            <div className="glance-section">
              <span className="glance-label">Client</span>
              <div className="glance-value" style={{ fontWeight: 500 }}>
                {getClientName(selectedTicket.client_id)}
              </div>
            </div>
            
            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Stage</span>
                <span className={`badge ${selectedTicket.current_stage === 'closed' || selectedTicket.current_stage === 'joined' ? 'badge-stage-success' : 'badge-stage'}`}>
                  {formatStage(selectedTicket.current_stage)}
                </span>
              </div>
              <div className="glance-section">
                <span className="glance-label">Status</span>
                <span className={`badge ${selectedTicket.status === 'active' ? 'badge-active' : selectedTicket.status === 'closed' ? 'badge-inactive' : 'badge-user'}`}>
                  {selectedTicket.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Priority</span>
                <span className={`badge badge-priority-${selectedTicket.priority}`}>
                  {selectedTicket.priority.toUpperCase()}
                </span>
              </div>
              <div className="glance-section">
                <span className="glance-label">Vacancies</span>
                <div className="glance-value">{selectedTicket.vacancies}</div>
              </div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Description</span>
              {selectedTicket.description ? (
                <div className="glance-description">{selectedTicket.description}</div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No description provided.</div>
              )}
            </div>

            {selectedTicket.created_at && (
              <div className="glance-section">
                <span className="glance-label">Created</span>
                <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </>
  );
};

export default Tickets;

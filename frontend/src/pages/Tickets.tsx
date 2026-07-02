import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import SlideOver from '../components/SlideOver';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import PriorityIndicator from '../components/PriorityIndicator';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import StagePipeline, { STAGE_ORDER } from '../components/StagePipeline';
import { Ticket as TicketIcon, Plus } from '../components/icons';

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

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
};

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const toast = useToast();

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
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    action: 'close' | 'delete' | 'reopen' | null;
    ticketId: string | null;
  }>({ isOpen: false, action: null, ticketId: null });
  const [reopenReason, setReopenReason] = useState('');

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
      
      const ticketsList = ticketsData.data || ticketsData;
      const enrichedTickets = await Promise.all(
        ticketsList.map((t: Ticket) => fetchApi(`/tickets/${t.id}`).catch(() => t))
      );
      
      setTickets(enrichedTickets);
      setClients(clientsData.data || clientsData);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to fetch tickets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetchApi('/tickets/', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', vacancies: 1, priority: 'default', client_id: '' });
      toast.success('Ticket created successfully');
      void loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create ticket'));
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
      toast.success('Ticket stage updated');
      void loadData();
      
      // Update selected ticket if it's open
      if (selectedTicket?.id === ticketId) {
        const updated = await fetchApi(`/tickets/${ticketId}`);
        setSelectedTicket(updated);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update ticket stage'));
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      await fetchApi(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority }),
      });
      toast.success('Ticket priority updated');
      void loadData();
      
      // Update selected ticket if it's open
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update priority'));
    }
  };

  const executeConfirmAction = async () => {
    const { action, ticketId } = confirmState;
    if (!action || !ticketId) return;

    try {
      if (action === 'close') {
        await fetchApi(`/tickets/${ticketId}/close`, { method: 'POST' });
        toast.success('Ticket closed');
      } else if (action === 'delete') {
        await fetchApi(`/tickets/${ticketId}`, { method: 'DELETE' });
        toast.success('Ticket deleted');
      } else if (action === 'reopen') {
        await fetchApi(`/tickets/${ticketId}/reopen-request`, {
          method: 'POST',
          body: JSON.stringify({ reason: reopenReason })
        });
        toast.success('Reopen request submitted');
      }
      void loadData();
      if (selectedTicket?.id === ticketId) {
        if (action === 'delete') {
          setSelectedTicket(null);
        } else {
          const updated = await fetchApi(`/tickets/${ticketId}`);
          setSelectedTicket(updated);
        }
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Failed to ${action} ticket`));
    } finally {
      setConfirmState({ isOpen: false, action: null, ticketId: null });
      setReopenReason('');
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.company_name || client.name) : 'Unknown Client';
  };

  const getStageName = (stageKey: string) => {
    return STAGE_ORDER.find(s => s.key === stageKey)?.label
      || stageKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <>
        <header className="top-header"><span className="top-header-title">Tickets</span></header>
        <div className="page-content">
          <div className="empty-state">
            <div className="spinner-icon" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '16px' }}>⟳</div>
            <div>Loading tickets...</div>
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
            <TicketIcon />
          </div>
          <span className="top-header-title">Requirement Tickets</span>
        </div>
        <div className="top-header-actions">
          <span className="text-secondary">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : <><Plus /> New Ticket</>}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {showCreate && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Create New Ticket</span>
            </div>
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Priority</th>
                  <th>Stage Progress</th>
                  <th>Status</th>
                  {(canUpdate || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="row-clickable animate-fadeInUp" onClick={() => setSelectedTicket(t)}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{t.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                        {t.ticket_number} • {t.vacancies} Vacanc{t.vacancies !== 1 ? 'ies' : 'y'}
                      </div>
                    </td>
                    <td>{getClientName(t.client_id)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <PriorityIndicator 
                        priority={t.priority} 
                        readonly={!canUpdate || t.status === 'closed' || t.status === 'cancelled'}
                        onChange={(val) => handlePriorityChange(t.id, val)}
                      />
                    </td>
                    <td>
                      <StagePipeline currentStage={t.current_stage} compact />
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                        {getStageName(t.current_stage)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge type="ticket-status" value={t.status} />
                    </td>
                    {(canUpdate || canDelete) && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                          {canUpdate && t.status !== 'closed' && (
                            <button 
                              className="btn btn-outline btn-sm" 
                              onClick={() => setConfirmState({ isOpen: true, action: 'close', ticketId: t.id })}
                            >
                              Close
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => setConfirmState({ isOpen: true, action: 'delete', ticketId: t.id })}
                            >
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
                    <td colSpan={(canUpdate || canDelete) ? 6 : 5}>
                      <EmptyState 
                        title="No tickets found" 
                        description="There are currently no active requirement tickets."
                        action={canCreate ? (
                          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            Create Ticket
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
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? selectedTicket.ticket_number : ''}
        variant="wide"
        mode="non-modal"
      >
        {selectedTicket && (
          <div className="ticket-details-slideover">
            <div className="ticket-detail-header">
              <div>
                <span className="ticket-detail-kicker">{selectedTicket.ticket_number}</span>
                <h2 className="ticket-detail-title">{selectedTicket.title}</h2>
              </div>
              <div className="ticket-detail-meta">
                <span className="text-secondary">{getClientName(selectedTicket.client_id)}</span>
                <StatusBadge type="ticket-status" value={selectedTicket.status} />
                <span className="text-muted">•</span>
                <PriorityIndicator 
                  priority={selectedTicket.priority} 
                  readonly={!canUpdate || selectedTicket.status === 'closed' || selectedTicket.status === 'cancelled'}
                  onChange={(val) => handlePriorityChange(selectedTicket.id, val)}
                />
              </div>
            </div>

            <section className="ticket-detail-section ticket-detail-pipeline">
              <div className="ticket-detail-section-header">
                <span className="glance-label">Pipeline Stage</span>
                <span className="ticket-stage-summary">{getStageName(selectedTicket.current_stage)}</span>
              </div>
              <StagePipeline 
                currentStage={selectedTicket.current_stage}
                validNextStages={canUpdate && selectedTicket.status !== 'closed' ? selectedTicket.valid_next_stages : []}
                onTransition={(stage) => handleStageTransition(selectedTicket.id, stage)}
                variant="detail"
              />
            </section>
            
            <div className="ticket-detail-facts">
              <section className="ticket-detail-fact">
                <span className="glance-label">Vacancies</span>
                <div className="glance-value">{selectedTicket.vacancies}</div>
              </section>
              
              {selectedTicket.created_at && (
                <section className="ticket-detail-fact">
                  <span className="glance-label">Created At</span>
                  <div className="glance-value text-secondary">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                </section>
              )}
            </div>

            <section className="ticket-detail-section">
              <span className="glance-label">Job Description</span>
              {selectedTicket.description ? (
                <div className="glance-description" style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic' }}>No description provided.</div>
              )}
            </section>

            {(canUpdate || canDelete) && (
              <div className="ticket-detail-actions-footer">
                 {canUpdate && selectedTicket.status !== 'closed' && selectedTicket.status !== 'cancelled' && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setConfirmState({ isOpen: true, action: 'close', ticketId: selectedTicket.id })}
                    >
                      Close Ticket
                    </button>
                  )}
                  {canUpdate && (selectedTicket.status === 'closed' || selectedTicket.status === 'cancelled') && (
                    <button 
                      className="btn btn-outline"
                      onClick={() => {
                        setReopenReason('');
                        setConfirmState({ isOpen: true, action: 'reopen', ticketId: selectedTicket.id });
                      }}
                    >
                      Request Reopen
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => setConfirmState({ isOpen: true, action: 'delete', ticketId: selectedTicket.id })}
                    >
                      Delete Ticket
                    </button>
                  )}
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => { setConfirmState({ isOpen: false, action: null, ticketId: null }); setReopenReason(''); }}
        onConfirm={executeConfirmAction}
        title={confirmState.action === 'close' ? 'Close Ticket' : confirmState.action === 'reopen' ? 'Request Reopen' : 'Delete Ticket'}
        description={
          confirmState.action === 'close' 
            ? 'Are you sure you want to close this ticket? No further transitions can be made.'
            : confirmState.action === 'reopen'
            ? 'Please provide a reason for reopening this ticket. An HR Manager must approve this request.'
            : 'Are you sure you want to permanently delete this ticket? This action cannot be undone.'
        }
        confirmText={confirmState.action === 'close' ? 'Close Ticket' : confirmState.action === 'reopen' ? 'Submit Request' : 'Delete Ticket'}
        variant={confirmState.action === 'close' ? 'warning' : confirmState.action === 'reopen' ? 'info' : 'danger'}
        requireInput={confirmState.action === 'reopen'}
        inputLabel="Reason for Reopening *"
        inputPlaceholder="Why does this ticket need to be reopened?"
        inputValue={reopenReason}
        onInputChange={setReopenReason}
        inputMinLength={5}
      />
    </>
  );
};

export default Tickets;

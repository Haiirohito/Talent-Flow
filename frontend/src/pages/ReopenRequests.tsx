import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import SlideOver from '../components/SlideOver';
import { RotateCcw } from '../components/icons';

interface ReopenRequest {
  id: string;
  ticket_id: string;
  requested_by: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Ticket {
  id: string;
  title: string;
  ticket_number: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

const ReopenRequests: React.FC = () => {
  const [requests, setRequests] = useState<ReopenRequest[]>([]);
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [selectedRequest, setSelectedRequest] = useState<ReopenRequest | null>(null);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | null;
    requestId: string | null;
  }>({ isOpen: false, action: null, requestId: null });
  const [reviewNotes, setReviewNotes] = useState('');

  const canApprove = hasPermission('tickets:reopen_approve');

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, ticketsData, usersData] = await Promise.all([
        fetchApi('/tickets/reopen-requests/all'),
        fetchApi('/tickets/'),
        fetchApi('/users/'),
      ]);
      
      setRequests(requestsData.data || requestsData);
      
      const ticketMap: Record<string, Ticket> = {};
      (ticketsData.data || ticketsData).forEach((t: Ticket) => { ticketMap[t.id] = t; });
      setTickets(ticketMap);

      const userMap: Record<string, User> = {};
      (usersData.data || usersData).forEach((u: User) => { userMap[u.id] = u; });
      setUsers(userMap);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch reopen requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeReview = async () => {
    const { action, requestId } = confirmState;
    if (!action || !requestId) return;

    try {
      await fetchApi(`/tickets/reopen-requests/${requestId}/review?action=${action}`, {
        method: 'POST',
        body: JSON.stringify({ notes: reviewNotes }),
      });
      toast.success(`Request ${action}d successfully`);
      loadData();
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} request`);
    } finally {
      setConfirmState({ isOpen: false, action: null, requestId: null });
      setReviewNotes('');
    }
  };

  const getTicketName = (ticketId: string) => {
    const t = tickets[ticketId];
    return t ? `${t.ticket_number} - ${t.title}` : 'Unknown Ticket';
  };

  const getUserName = (userId: string) => {
    const u = users[userId];
    return u ? (u.full_name || u.email) : 'Unknown User';
  };

  const openReviewModal = (action: 'approve' | 'reject', requestId: string) => {
    setReviewNotes('');
    setConfirmState({ isOpen: true, action, requestId });
  };

  if (loading) {
    return (
      <>
        <header className="top-header"><span className="top-header-title">Reopen Requests</span></header>
        <div className="page-content">
          <div className="empty-state">
            <div className="spinner-icon" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '16px' }}>⟳</div>
            <div>Loading requests...</div>
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
            <RotateCcw />
          </div>
          <span className="top-header-title">Reopen Requests</span>
        </div>
      </header>

      <div className="page-content">
        <div className="table-card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                  {canApprove && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="row-clickable animate-fadeInUp" onClick={() => setSelectedRequest(r)}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{getTicketName(r.ticket_id)}</div>
                    </td>
                    <td>{getUserName(r.requested_by)}</td>
                    <td className="text-muted">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'pending' ? 'badge-stage' : r.status === 'approved' ? 'badge-stage-success' : 'badge-danger'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    {canApprove && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                          {r.status === 'pending' && (
                            <>
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                                onClick={() => openReviewModal('approve', r.id)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                                onClick={() => openReviewModal('reject', r.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={canApprove ? 5 : 4}>
                      <EmptyState 
                        title="No requests" 
                        description="There are currently no reopen requests pending."
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
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Reopen Request Details"
      >
        {selectedRequest && (
          <div>
            <div className="glance-section">
              <span className="glance-label">Ticket</span>
              <div className="glance-value" style={{ fontWeight: 500 }}>
                {getTicketName(selectedRequest.ticket_id)}
              </div>
            </div>
            
            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Requested By</span>
                <div className="glance-value">{getUserName(selectedRequest.requested_by)}</div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Status</span>
                <span className={`badge ${selectedRequest.status === 'pending' ? 'badge-stage' : selectedRequest.status === 'approved' ? 'badge-stage-success' : 'badge-danger'}`}>
                  {selectedRequest.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="glance-section">
              <span className="glance-label">Reason for Reopening</span>
              <div className="glance-description" style={{ whiteSpace: 'pre-wrap' }}>{selectedRequest.reason}</div>
            </div>

            {selectedRequest.status !== 'pending' && selectedRequest.reviewed_by && (
              <>
                <div className="grid-2">
                  <div className="glance-section">
                    <span className="glance-label">Reviewed By</span>
                    <div className="glance-value">{getUserName(selectedRequest.reviewed_by)}</div>
                  </div>
                  <div className="glance-section">
                    <span className="glance-label">Reviewed At</span>
                    <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                      {selectedRequest.reviewed_at ? new Date(selectedRequest.reviewed_at).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
                {selectedRequest.review_notes && (
                  <div className="glance-section">
                    <span className="glance-label">Review Notes</span>
                    <div className="glance-description" style={{ whiteSpace: 'pre-wrap' }}>{selectedRequest.review_notes}</div>
                  </div>
                )}
              </>
            )}
            
            {canApprove && selectedRequest.status === 'pending' && (
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                 <button 
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                    onClick={() => {
                      setSelectedRequest(null);
                      openReviewModal('reject', selectedRequest.id);
                    }}
                  >
                    Reject
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ background: 'var(--color-success)' }}
                    onClick={() => {
                      setSelectedRequest(null);
                      openReviewModal('approve', selectedRequest.id);
                    }}
                  >
                    Approve
                  </button>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, action: null, requestId: null })}
        onConfirm={executeReview}
        title={confirmState.action === 'approve' ? 'Approve Reopen Request' : 'Reject Reopen Request'}
        description={
          confirmState.action === 'approve' 
            ? 'Are you sure you want to approve this request? The ticket will be reopened.'
            : 'Are you sure you want to reject this request? The ticket will remain closed/cancelled.'
        }
        confirmText={confirmState.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        variant={confirmState.action === 'approve' ? 'success' : 'danger'}
      >
        <div style={{ marginTop: 16 }}>
          <label className="form-label">Review Notes (Optional)</label>
          <textarea
            className="form-input"
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            placeholder="Add any notes about your decision..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>
      </ConfirmModal>
    </>
  );
};

export default ReopenRequests;

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import { Users, Plus, Mail, ChevronDown, ChevronUp } from '../components/icons';

interface TeamMember {
  id: string;
  team_lead_id: string;
  recruiter_id: string;
  recruiter_name: string | null;
  recruiter_email: string | null;
  recruiter_role: string | null;
  added_at: string | null;
}

interface UnassignedRecruiter {
  id: string;
  full_name: string | null;
  email: string;
}

interface TeamLeadInfo {
  id: string;
  full_name: string | null;
  email: string;
}

interface AdminTeamData {
  team_lead_id: string;
  team_lead_name: string | null;
  team_lead_email: string;
  member_count: number;
  members: TeamMember[];
}

const MyTeam: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedRecruiter[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLeadInfo[]>([]);
  
  // Admin state
  const [adminTeams, setAdminTeams] = useState<AdminTeamData[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const toast = useToast();

  const isAdmin = user?.role === 'admin';

  // Add member form (Team Lead only)
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState('');
  const [adding, setAdding] = useState(false);

  // Transfer state — inline per-member (Team Lead only)
  const [transferingId, setTransferingId] = useState<string | null>(null);
  const [targetTeamLeadId, setTargetTeamLeadId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Remove state (Team Lead only)
  const [removeState, setRemoveState] = useState<{
    isOpen: boolean;
    memberId: string | null;
    recruiterName: string | null;
  }>({ isOpen: false, memberId: null, recruiterName: null });

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const teamsData = await fetchApi('/teams/all-teams');
        setAdminTeams(teamsData || []);
      } else {
        const [teamData, unassignedData, leadsData] = await Promise.all([
          fetchApi('/teams/my-team'),
          fetchApi('/teams/unassigned-recruiters'),
          fetchApi('/teams/team-leads'),
        ]);

        setMembers(teamData.data || []);
        setUnassigned(unassignedData || []);
        // Filter out current user from team leads list (for transfer)
        setTeamLeads((leadsData || []).filter((l: TeamLeadInfo) => l.id !== user?.id));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruiterId) return;
    setAdding(true);
    try {
      await fetchApi('/teams/members', {
        method: 'POST',
        body: JSON.stringify({ recruiter_id: selectedRecruiterId }),
      });
      toast.success('Recruiter added to your team');
      setSelectedRecruiterId('');
      setShowAdd(false);
      void loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeState.memberId) return;
    try {
      await fetchApi(`/teams/members/${removeState.memberId}`, {
        method: 'DELETE',
      });
      toast.success('Recruiter removed from your team');
      void loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove team member');
    } finally {
      setRemoveState({ isOpen: false, memberId: null, recruiterName: null });
    }
  };

  const handleTransfer = async (recruiterId: string) => {
    if (!targetTeamLeadId) return;
    setTransferring(true);
    try {
      await fetchApi('/teams/transfer', {
        method: 'POST',
        body: JSON.stringify({
          recruiter_id: recruiterId,
          target_team_lead_id: targetTeamLeadId,
        }),
      });
      toast.success('Recruiter transferred successfully');
      setTransferingId(null);
      setTargetTeamLeadId('');
      void loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to transfer team member');
    } finally {
      setTransferring(false);
    }
  };

  const toggleRow = (teamLeadId: string) => {
    const next = new Set(expandedRows);
    if (next.has(teamLeadId)) {
      next.delete(teamLeadId);
    } else {
      next.add(teamLeadId);
    }
    setExpandedRows(next);
  };

  if (loading) {
    return (
      <>
        <header className="top-header">
          <span className="top-header-title">{isAdmin ? 'Teams' : 'My Team'}</span>
        </header>
        <div className="page-content">
          <div className="empty-state">
            <div className="spinner-icon" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '16px' }}>⟳</div>
            <div>Loading team data...</div>
          </div>
        </div>
      </>
    );
  }

  // ----------------------------------------------------------------------
  // ADMIN VIEW
  // ----------------------------------------------------------------------
  if (isAdmin) {
    return (
      <>
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-brand-icon">
              <Users />
            </div>
            <span className="top-header-title">Teams Overview</span>
          </div>
          <div className="top-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <span><strong style={{ color: 'var(--color-text)' }}>{adminTeams.length}</strong> team leads</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span><strong style={{ color: 'var(--color-text)' }}>{adminTeams.reduce((acc, t) => acc + t.member_count, 0)}</strong> total recruiters</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <div className="table-card">
            <div className="table-card-header">
              <span className="table-card-title">All Teams</span>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Team Lead</th>
                    <th>Email</th>
                    <th style={{ textAlign: 'right' }}>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {adminTeams.map(team => (
                    <React.Fragment key={team.team_lead_id}>
                      <tr 
                        className="animate-fadeInUp row-clickable" 
                        onClick={() => toggleRow(team.team_lead_id)}
                        style={{ background: expandedRows.has(team.team_lead_id) ? 'var(--color-surface-hover)' : '' }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          {expandedRows.has(team.team_lead_id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'var(--color-primary)',
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                            }}>
                              {(team.team_lead_name || team.team_lead_email || '?')
                                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 500 }}>
                              {team.team_lead_name || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <a href={`mailto:${team.team_lead_email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} />
                            {team.team_lead_email}
                          </a>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {team.member_count}
                        </td>
                      </tr>
                      {expandedRows.has(team.team_lead_id) && (
                        <tr className="animate-fadeInDown">
                          <td colSpan={4} style={{ padding: 0, borderBottom: '2px solid var(--color-border)' }}>
                            <div style={{ padding: '16px 24px', paddingLeft: '64px', background: 'var(--color-bg-subtle)' }}>
                              {team.members.length === 0 ? (
                                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
                                  No recruiters assigned to this team.
                                </div>
                              ) : (
                                <table className="table" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                  <thead>
                                    <tr>
                                      <th>Recruiter Name</th>
                                      <th>Recruiter Email</th>
                                      <th>Role</th>
                                      <th>Added To Team</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.members.map(m => (
                                      <tr key={m.id}>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                              width: 24, height: 24, borderRadius: '50%',
                                              background: 'var(--color-bg-subtle)',
                                              color: 'var(--color-text)',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
                                            }}>
                                              {(m.recruiter_name || m.recruiter_email || '?')
                                                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <span style={{ fontSize: '0.875rem' }}>{m.recruiter_name || '—'}</span>
                                          </div>
                                        </td>
                                        <td style={{ fontSize: '0.875rem' }}>{m.recruiter_email}</td>
                                        <td>
                                          <span className={`badge ${m.recruiter_role === 'admin' ? 'badge-admin' : 'badge-user'}`} style={{ textTransform: 'capitalize' }}>
                                            {m.recruiter_role?.replace('_', ' ') || 'recruiter'}
                                          </span>
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                                          {m.added_at ? new Date(m.added_at).toLocaleDateString() : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {adminTeams.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState
                          title="No teams found"
                          description="There are currently no active team leads in the system."
                        />
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
  }

  // ----------------------------------------------------------------------
  // TEAM LEAD VIEW
  // ----------------------------------------------------------------------
  return (
    <>
      <header className="top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-brand-icon">
            <Users />
          </div>
          <span className="top-header-title">My Team</span>
        </div>
        <div className="top-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <span><strong style={{ color: 'var(--color-text)' }}>{members.length}</strong> member{members.length !== 1 ? 's' : ''}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span><strong style={{ color: 'var(--color-text)' }}>{unassigned.length}</strong> available to add</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span><strong style={{ color: 'var(--color-text)' }}>{teamLeads.length}</strong> other leads</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : <><Plus /> Add Recruiter</>}
          </button>
        </div>
      </header>

      <div className="page-content">

        {/* Add Recruiter Form */}
        {showAdd && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Add Recruiter to Team</span>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-muted" style={{ padding: '8px 0' }}>
                All recruiters are already assigned to a team. You can invite new recruiters or request a transfer from another team lead.
              </p>
            ) : (
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Select Recruiter</label>
                  <select
                    className="form-input"
                    value={selectedRecruiterId}
                    onChange={e => setSelectedRecruiterId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Choose a recruiter…</option>
                    {unassigned.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.full_name || r.email} {r.full_name ? `(${r.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={adding || !selectedRecruiterId}>
                    {adding ? 'Adding…' : 'Add to Team'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Team Members */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Team Members</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <React.Fragment key={m.id}>
                    <tr className="animate-fadeInUp">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                          }}>
                            {(m.recruiter_name || m.recruiter_email || '?')
                              .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span style={{ fontWeight: 500 }}>
                            {m.recruiter_name || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${m.recruiter_email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={16} />
                          {m.recruiter_email}
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${m.recruiter_role === 'admin' ? 'badge-admin' : 'badge-user'}`} style={{ textTransform: 'capitalize' }}>
                          {m.recruiter_role?.replace('_', ' ') || 'recruiter'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {m.added_at ? new Date(m.added_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                          {teamLeads.length > 0 && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                if (transferingId === m.id) {
                                  setTransferingId(null);
                                  setTargetTeamLeadId('');
                                } else {
                                  setTargetTeamLeadId('');
                                  setTransferingId(m.id);
                                }
                              }}
                            >
                              {transferingId === m.id ? 'Cancel' : 'Transfer'}
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setRemoveState({
                              isOpen: true,
                              memberId: m.id,
                              recruiterName: m.recruiter_name || m.recruiter_email,
                            })}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Inline transfer row */}
                    {transferingId === m.id && (
                      <tr className="animate-fadeInDown">
                        <td colSpan={4} style={{ background: 'var(--color-surface-hover)', borderLeft: '3px solid var(--color-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                            <span className="text-secondary" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                              Transfer <strong>{m.recruiter_name || m.recruiter_email}</strong> to:
                            </span>
                            <select
                              className="form-input form-input-sm"
                              value={targetTeamLeadId}
                              onChange={e => setTargetTeamLeadId(e.target.value)}
                              style={{ maxWidth: 250 }}
                            >
                              <option value="" disabled>Select team lead…</option>
                              {teamLeads.map(tl => (
                                <option key={tl.id} value={tl.id}>
                                  {tl.full_name || tl.email}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!targetTeamLeadId || transferring}
                              onClick={() => handleTransfer(m.recruiter_id)}
                            >
                              {transferring ? 'Transferring…' : 'Confirm'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="No team members yet"
                        description={
                          unassigned.length > 0
                            ? `There are ${unassigned.length} unassigned recruiter${unassigned.length !== 1 ? 's' : ''} available. Add them to your team to start assigning tickets.`
                            : 'All recruiters are assigned to other teams. You can invite new users or request a transfer.'
                        }
                        action={
                          unassigned.length > 0 ? (
                            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                              <Plus /> Add Recruiter
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Remove Confirmation */}
      <ConfirmModal
        isOpen={removeState.isOpen}
        onClose={() => setRemoveState({ isOpen: false, memberId: null, recruiterName: null })}
        onConfirm={handleRemove}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeState.recruiterName || 'this recruiter'} from your team? They will also be unassigned from any tickets you've assigned them to.`}
        confirmText="Remove"
        variant="danger"
      />
    </>
  );
};

export default MyTeam;

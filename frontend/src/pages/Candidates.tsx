import React, { useState, useEffect, useRef } from 'react';
import { fetchApi, API_URL } from '../api/client';
import { useAuth } from '../components/AuthContext';
import SlideOver from '../components/SlideOver';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { UserCheck, Plus, Upload, X, FileText, Download } from '../components/icons';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skills: string | null;
  resume_filename: string | null;
  resume_path: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// ── Skills Tag Input Component ──
const SkillsTagInput: React.FC<{
  skills: string[];
  onChange: (skills: string[]) => void;
  disabled?: boolean;
}> = ({ skills, onChange, disabled }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && !input && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  };

  const removeSkill = (idx: number) => {
    onChange(skills.filter((_, i) => i !== idx));
  };

  return (
    <div
      className="skills-tag-input"
      onClick={() => inputRef.current?.focus()}
    >
      {skills.map((skill, idx) => (
        <span key={idx} className="skill-tag">
          {skill}
          {!disabled && (
            <button
              type="button"
              className="skill-tag-remove"
              onClick={(e) => { e.stopPropagation(); removeSkill(idx); }}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          className="skills-tag-input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addSkill(input); }}
          placeholder={skills.length === 0 ? 'Type a skill and press Enter…' : ''}
        />
      )}
    </div>
  );
};

// ── Resume Upload Component ──
const ResumeUpload: React.FC<{
  file: File | null;
  currentFilename: string | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent?: () => void;
}> = ({ file, currentFilename, onFileChange, onRemoveCurrent }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="resume-upload-area">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (f) {
            if (f.type !== 'application/pdf') {
              alert('Only PDF files are allowed');
              return;
            }
            if (f.size > 10 * 1024 * 1024) {
              alert('File must be smaller than 10 MB');
              return;
            }
          }
          onFileChange(f);
          // Reset input so re-uploading the same file triggers onChange
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
      {file ? (
        <div className="resume-file-badge">
          <FileText size={16} />
          <span className="resume-file-name">{file.name}</span>
          <button
            type="button"
            className="skill-tag-remove"
            onClick={() => onFileChange(null)}
          >
            <X size={14} />
          </button>
        </div>
      ) : currentFilename ? (
        <div className="resume-file-badge resume-file-existing">
          <FileText size={16} />
          <span className="resume-file-name">{currentFilename}</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace
          </button>
          {onRemoveCurrent && (
            <button
              type="button"
              className="skill-tag-remove"
              onClick={onRemoveCurrent}
              title="Remove resume"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="resume-upload-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          <span>Upload Resume (PDF)</span>
        </button>
      )}
    </div>
  );
};

// ── Helpers ──
function parseSkills(skills: string | null): string[] {
  if (!skills) return [];
  return skills.split(',').map(s => s.trim()).filter(Boolean);
}

function serializeSkills(skills: string[]): string {
  return skills.join(', ');
}

function getResumeUrl(candidateId: string): string {
  const token = localStorage.getItem('access_token');
  return `${API_URL}/candidates/${candidateId}/resume?token=${token}`;
}

// ── Main Component ──
const Candidates: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const toast = useToast();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [createSkills, setCreateSkills] = useState<string[]>([]);
  const [createResume, setCreateResume] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    notes: '',
    is_active: true,
  });
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editResume, setEditResume] = useState<File | null>(null);
  const [editCurrentResume, setEditCurrentResume] = useState<string | null>(null);
  const [removeResume, setRemoveResume] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    candidateId: string | null;
  }>({ isOpen: false, candidateId: null });

  // Resume viewer state
  const [showResumeViewer, setShowResumeViewer] = useState(false);

  const canCreate = hasPermission('candidates:create');
  const canUpdate = hasPermission('candidates:update');
  const canDelete = hasPermission('candidates:delete');

  const loadCandidates = async () => {
    try {
      const data = await fetchApi('/candidates/');
      setCandidates(data.data || data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create Candidate ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('full_name', createForm.full_name);
      formData.append('email', createForm.email);
      if (createForm.phone) formData.append('phone', createForm.phone);
      if (createSkills.length > 0) formData.append('skills', serializeSkills(createSkills));
      if (createForm.notes) formData.append('notes', createForm.notes);
      if (createResume) formData.append('resume', createResume);

      await fetchApi('/candidates/', {
        method: 'POST',
        body: formData,
      });
      setShowCreate(false);
      setCreateForm({ full_name: '', email: '', phone: '', notes: '' });
      setCreateSkills([]);
      setCreateResume(null);
      toast.success('Candidate created successfully');
      loadCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create candidate');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Candidate ──
  const startEdit = (c: Candidate) => {
    setEditingId(c.id);
    setEditForm({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone || '',
      notes: c.notes || '',
      is_active: c.is_active,
    });
    setEditSkills(parseSkills(c.skills));
    setEditResume(null);
    setEditCurrentResume(c.resume_filename);
    setRemoveResume(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Handle resume removal first
      if (removeResume && editingId) {
        await fetchApi(`/candidates/${editingId}/resume`, { method: 'DELETE' });
      }

      const formData = new FormData();
      formData.append('full_name', editForm.full_name);
      formData.append('email', editForm.email);
      formData.append('phone', editForm.phone || '');
      formData.append('skills', serializeSkills(editSkills));
      formData.append('notes', editForm.notes || '');
      formData.append('is_active', editForm.is_active ? 'true' : 'false');
      if (editResume) formData.append('resume', editResume);

      await fetchApi(`/candidates/${editingId}`, {
        method: 'PATCH',
        body: formData,
      });
      setEditingId(null);
      toast.success('Candidate updated successfully');
      loadCandidates();
      // Refresh selected candidate if open
      if (selectedCandidate?.id === editingId) {
        const refreshed = await fetchApi(`/candidates/${editingId}`);
        setSelectedCandidate(refreshed);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update candidate');
    }
  };

  // ── Delete Candidate ──
  const executeDelete = async () => {
    const { candidateId } = confirmState;
    if (!candidateId) return;

    try {
      await fetchApi(`/candidates/${candidateId}`, { method: 'DELETE' });
      toast.success('Candidate deleted successfully');
      loadCandidates();
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete candidate');
    } finally {
      setConfirmState({ isOpen: false, candidateId: null });
    }
  };

  if (loading) {
    return (
      <>
        <header className="top-header">
          <span className="top-header-title">Candidates</span>
        </header>
        <div className="page-content">
          <div className="empty-state">
            <div className="spinner-icon" style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '16px' }}>⟳</div>
            <div>Loading candidates...</div>
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
            <UserCheck />
          </div>
          <span className="top-header-title">Candidate Management</span>
        </div>
        <div className="top-header-actions">
          <span className="text-secondary">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</span>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : <><Plus /> New Candidate</>}
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {/* ── Create Candidate Form ── */}
        {showCreate && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Add New Candidate</span>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={createForm.full_name}
                    onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="John Doe"
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
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Resume (PDF)</label>
                  <ResumeUpload
                    file={createResume}
                    currentFilename={null}
                    onFileChange={setCreateResume}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Skills</label>
                <SkillsTagInput skills={createSkills} onChange={setCreateSkills} />
                <span className="form-hint">Press Enter or comma to add a skill</span>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Additional notes about this candidate…"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Edit Candidate Form ── */}
        {editingId && (
          <div className="card animate-fadeInDown" style={{ marginBottom: 24, borderLeft: '4px solid var(--color-primary)' }}>
            <div className="card-header">
              <span className="card-title">Edit Candidate</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={editForm.full_name}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
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
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Resume (PDF)</label>
                  <ResumeUpload
                    file={editResume}
                    currentFilename={removeResume ? null : editCurrentResume}
                    onFileChange={(f) => {
                      setEditResume(f);
                      if (f) setRemoveResume(false);
                    }}
                    onRemoveCurrent={() => {
                      setRemoveResume(true);
                      setEditCurrentResume(null);
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Skills</label>
                <SkillsTagInput skills={editSkills} onChange={setEditSkills} />
                <span className="form-hint">Press Enter or comma to add a skill</span>
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

        {/* ── Candidates Table ── */}
        <div className="table-card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Contact</th>
                  <th>Skills</th>
                  <th>Resume</th>
                  <th>Status</th>
                  <th>Added</th>
                  {(canUpdate || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c: Candidate) => (
                  <tr key={c.id} className="row-clickable animate-fadeInUp" onClick={() => { setSelectedCandidate(c); setShowResumeViewer(false); }}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{c.full_name}</div>
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
                      <div className="skills-cell">
                        {parseSkills(c.skills).slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="skill-pill">{skill}</span>
                        ))}
                        {parseSkills(c.skills).length > 3 && (
                          <span className="skill-pill skill-pill-more">+{parseSkills(c.skills).length - 3}</span>
                        )}
                        {parseSkills(c.skills).length === 0 && (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {c.resume_filename ? (
                        <span className="resume-indicator">
                          <FileText size={14} />
                          <span style={{ fontSize: '0.75rem' }}>PDF</span>
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
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
                                setConfirmState({ isOpen: true, candidateId: c.id });
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
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={(canUpdate || canDelete) ? 7 : 6}>
                      <EmptyState
                        title="No candidates found"
                        description="There are currently no candidates in the system."
                        action={canCreate ? (
                          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            Add Candidate
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

      {/* ── Candidate Details SlideOver ── */}
      <SlideOver
        isOpen={!!selectedCandidate}
        onClose={() => { setSelectedCandidate(null); setShowResumeViewer(false); }}
        title={selectedCandidate ? selectedCandidate.full_name : ''}
        variant="wide"
      >
        {selectedCandidate && (
          <div className="ticket-details-slideover">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>{selectedCandidate.full_name}</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge type="active" value={selectedCandidate.is_active ? 'active' : 'inactive'} />
                {selectedCandidate.resume_filename && (
                  <>
                    <span className="text-muted">•</span>
                    <span className="resume-indicator">
                      <FileText size={14} />
                      <span style={{ fontSize: '0.8rem' }}>Resume attached</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Email</span>
                <div className="glance-value">
                  <a href={`mailto:${selectedCandidate.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                    {selectedCandidate.email}
                  </a>
                </div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Phone</span>
                <div className="glance-value">{selectedCandidate.phone || '—'}</div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="glance-section">
              <span className="glance-label">Skills</span>
              <div className="skills-display">
                {parseSkills(selectedCandidate.skills).length > 0 ? (
                  parseSkills(selectedCandidate.skills).map((skill, idx) => (
                    <span key={idx} className="skill-pill skill-pill-detail">{skill}</span>
                  ))
                ) : (
                  <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No skills listed.</div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="glance-section">
              <span className="glance-label">Notes</span>
              {selectedCandidate.notes ? (
                <div className="glance-description" style={{ whiteSpace: 'pre-wrap' }}>{selectedCandidate.notes}</div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No notes provided.</div>
              )}
            </div>

            {/* Resume Section */}
            <div className="glance-section">
              <span className="glance-label">Resume</span>
              {selectedCandidate.resume_filename ? (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <span className="resume-file-badge resume-file-existing">
                      <FileText size={16} />
                      <span className="resume-file-name">{selectedCandidate.resume_filename}</span>
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowResumeViewer(!showResumeViewer)}
                    >
                      {showResumeViewer ? 'Hide Preview' : 'View Resume'}
                    </button>
                    <a
                      href={getResumeUrl(selectedCandidate.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Download size={14} />
                      Open
                    </a>
                  </div>
                  {showResumeViewer && (
                    <div className="resume-viewer-container animate-fadeInDown">
                      <iframe
                        src={getResumeUrl(selectedCandidate.id)}
                        title="Resume Preview"
                        className="resume-viewer-iframe"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No resume uploaded.</div>
              )}
            </div>

            <div className="grid-2">
              <div className="glance-section">
                <span className="glance-label">Created At</span>
                <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                  {selectedCandidate.created_at ? new Date(selectedCandidate.created_at).toLocaleString() : '—'}
                </div>
              </div>
              <div className="glance-section">
                <span className="glance-label">Last Updated</span>
                <div className="glance-value text-secondary" style={{ fontSize: '0.875rem' }}>
                  {selectedCandidate.updated_at ? new Date(selectedCandidate.updated_at).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {(canUpdate || canDelete) && (
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                {canUpdate && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedCandidate(null);
                      startEdit(selectedCandidate);
                    }}
                  >
                    Edit Candidate
                  </button>
                )}
                {canDelete && (
                  <button
                    className="btn btn-danger"
                    onClick={() => setConfirmState({ isOpen: true, candidateId: selectedCandidate.id })}
                  >
                    Delete Candidate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, candidateId: null })}
        onConfirm={executeDelete}
        title="Delete Candidate"
        description="Are you sure you want to permanently delete this candidate? This action cannot be undone and will also remove their resume file."
        confirmText="Delete Candidate"
        variant="danger"
      />
    </>
  );
};

export default Candidates;

import React, { useState } from 'react';
import { fetchApi } from '../api/client';

const EmailTest: React.FC = () => {
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);

    try {
      // The API expects email_to as a query parameter
      await fetchApi(`/email/test-email/?email_to=${encodeURIComponent(emailTo)}`, {
        method: 'POST',
      });
      setSuccess(`Test email sent to ${emailTo}`);
      setEmailTo('');
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="top-header">
        <span className="top-header-title">Email Testing</span>
      </header>

      <div className="page-content">
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Send Test Email</span>
            </div>
            <p className="text-secondary" style={{ marginBottom: 20 }}>
              Verify your SMTP email configuration by sending a test email. This requires the <code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4, fontSize: '0.8125rem' }}>system:email_test</code> permission.
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSendTest}>
              <div className="form-group">
                <label className="form-label" htmlFor="test-email">Recipient Email</label>
                <input
                  id="test-email"
                  className="form-input"
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="test@example.com"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send Test Email'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailTest;

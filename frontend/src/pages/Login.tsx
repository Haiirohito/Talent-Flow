import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../api/client';
import { Mail, Lock, Shield, Zap, Users } from '../components/icons';
import { useToast } from '../components/Toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetchApi('/login/access-token', {
        method: 'POST',
        body: formData,
      });

      login(response.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <h1>TalentFlow</h1>
          <p>The modern platform for streamlined recruitment and candidate management.</p>
          
          <div className="login-brand-features">
            <div className="login-brand-feature">
              <Zap /> End-to-end applicant tracking
            </div>
            <div className="login-brand-feature">
              <Users /> Collaborative hiring pipelines
            </div>
            <div className="login-brand-feature">
              <Shield /> Secure & role-based access
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-logo" style={{ textAlign: 'center', marginBottom: '8px' }}>Welcome back</div>
          <p className="login-subtitle" style={{ textAlign: 'center' }}>Sign in to your account to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div className="form-input-icon-wrapper">
                <Mail />
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="form-input-icon-wrapper">
                <Lock />
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
              style={{ marginTop: 20, height: 44 }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-icon">⟳</span> Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import { PermissionRoute } from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Candidates from './pages/Candidates';
import Tickets from './pages/Tickets';
import ReopenRequests from './pages/ReopenRequests';
import InviteUser from './pages/InviteUser';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import EmailTest from './pages/EmailTest';
import MyTeam from './pages/MyTeam';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected — wrapped in sidebar/header shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />

                {/* Permission-gated routes */}
                <Route element={<PermissionRoute permission="users:read" />}>
                  <Route path="/users" element={<Users />} />
                </Route>
                <Route element={<PermissionRoute permission="clients:read" />}>
                  <Route path="/clients" element={<Clients />} />
                </Route>
                <Route element={<PermissionRoute permission="candidates:read" />}>
                  <Route path="/candidates" element={<Candidates />} />
                </Route>
                <Route element={<PermissionRoute permission="tickets:read" />}>
                  <Route path="/tickets" element={<Tickets />} />
                </Route>
                <Route element={<PermissionRoute permission="tickets:reopen_approve" />}>
                  <Route path="/reopen-requests" element={<ReopenRequests />} />
                </Route>
                <Route element={<PermissionRoute permission="team:manage" />}>
                  <Route path="/my-team" element={<MyTeam />} />
                </Route>
                <Route element={<PermissionRoute permission="users:invite" />}>
                  <Route path="/invite" element={<InviteUser />} />
                </Route>
                <Route element={<PermissionRoute permission="dashboard:admin" />}>
                  <Route path="/admin" element={<AdminPanel />} />
                </Route>
                <Route element={<PermissionRoute permission="system:settings" />}>
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route element={<PermissionRoute permission="system:email_test" />}>
                  <Route path="/email-test" element={<EmailTest />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

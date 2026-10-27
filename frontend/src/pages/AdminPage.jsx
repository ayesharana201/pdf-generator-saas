import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
const [apiAccessRequests, setApiAccessRequests] = useState([]);
const [owner, setOwner] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setError('');

    try {
      const [s, k, r] = await Promise.all([
  api.queueStats(),
  api.listApiKeys(),
  api.listApiAccessRequests('pending'),
]);

setStats(s);
setApiKeys(k.apiKeys || []);
setApiAccessRequests(r.requests || []);
      setAuthenticated(true);
    } catch (err) {
      console.error('Admin dashboard load failed:', err);

      if (
        err.message?.includes('Admin session required') ||
        err.message?.includes('Invalid or expired admin session') ||
        err.message?.includes('Admin session is no longer valid')
      ) {
        setAuthenticated(false);
      }

      setError(err.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setError('');
    setLoginLoading(true);

    try {
      await api.adminLogin(password);

      setPassword('');
      setAuthenticated(true);
      setLoading(true);

      await load();
    } catch (err) {
      console.error('Admin login failed:', err);
      setError(err.message || 'Invalid admin password.');
      setAuthenticated(false);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    setError('');

    try {
      await api.adminLogout();

      setAuthenticated(false);
      setStats(null);
setApiKeys([]);
setApiAccessRequests([]);
setNewKey(null);
    } catch (err) {
      console.error('Admin logout failed:', err);
      setError(err.message || 'Failed to log out.');
    }
  }

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    load();

const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [authenticated]);

  async function handleCreateKey(e) {
    e.preventDefault();

    if (!owner.trim()) return;

    setError('');
    setActionLoading(true);
    setNewKey(null);

    try {
      const res = await api.createApiKey(owner.trim());

      setNewKey(res.apiKey.key);
      setOwner('');

      await load();
    } catch (err) {
      console.error('Create API key failed:', err);
      setError(err.message || 'Failed to create API key.');
    } finally {
      setActionLoading(false);
    }
  }
    async function handleApproveRequest(id) {
    setError('');
    setActionLoading(true);
    setNewKey(null);

    try {
      const res = await api.approveApiAccessRequest(id);

      if (res.apiKey) {
        setNewKey(res.apiKey);
      }

      await load();
    } catch (err) {
      console.error('Approve API access request failed:', err);
      setError(
        err.message || 'Failed to approve API access request.'
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectRequest(id) {
    setError('');
    setActionLoading(true);

    try {
      await api.rejectApiAccessRequest(id);

      await load();
    } catch (err) {
      console.error('Reject API access request failed:', err);
      setError(
        err.message || 'Failed to reject API access request.'
      );
    } finally {
      setActionLoading(false);
    }
  }
  async function handleRevoke(id) {
    setError('');
    setActionLoading(true);

    try {
      await api.revokeApiKey(id);

      await load();
    } catch (err) {
      console.error('Revoke API key failed:', err);
      setError(err.message || 'Failed to revoke API key.');
    } finally {
      setActionLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div>
        <h1>Admin Login</h1>

        <p className="page-subtitle">
          Sign in to access queue health, job throughput, and API access
          management.
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div
          className="card"
          style={{
            maxWidth: 480,
            marginTop: 24,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Administrator authentication
          </h3>

          <form onSubmit={handleLogin}>
            <div>
              <label>Admin Password</label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
                disabled={loginLoading}
              />
            </div>

            <button
              className="btn"
              type="submit"
              style={{ marginTop: 16 }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1>Admin Dashboard</h1>

          <p className="page-subtitle">
            Redis queue health, job throughput, and API access for
            integrations.
          </p>
        </div>

        <button
          className="btn btn-small"
          onClick={handleLogout}
          disabled={actionLoading}
        >
          Log Out
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading && !stats && (
        <div className="card">
          <p>Loading admin dashboard...</p>
        </div>
      )}

      {stats && (
        <div className="stat-grid">
          <div className="stat-box">
            <div className="value">
              {stats.queueCounts.waiting}
            </div>
            <div className="label">Waiting</div>
          </div>

          <div className="stat-box">
            <div className="value">
              {stats.queueCounts.active}
            </div>
            <div className="label">Rendering now</div>
          </div>

          <div className="stat-box">
            <div className="value">
              {stats.queueCounts.completed}
            </div>
            <div className="label">Completed</div>
          </div>

          <div className="stat-box">
            <div className="value">
              {stats.queueCounts.failed}
            </div>
            <div className="label">Failed</div>
          </div>

          <div className="stat-box">
            <div className="value">
              {stats.jobsLast24h}
            </div>
            <div className="label">Jobs (24h)</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>API Keys</h3>
              <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>
              API Access Requests
            </h3>

            <p style={{ margin: 0 }}>
              Companies waiting for API integration approval.
            </p>
          </div>

          <span className="badge">
            {apiAccessRequests.length} pending
          </span>
        </div>

        {apiAccessRequests.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Use Case</th>
                  <th>Expected Volume</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {apiAccessRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.companyName}</strong>
                      {request.contactName && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          {request.contactName}
                        </div>
                      )}
                    </td>

                    <td>{request.email}</td>

                    <td style={{ minWidth: 220 }}>
                      {request.useCase}
                    </td>

                    <td>
                      {request.expectedVolume || 'Not specified'}
                    </td>

                    <td>
                      {new Date(
                        request.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          className="btn btn-small"
                          onClick={() =>
                            handleApproveRequest(request.id)
                          }
                          disabled={actionLoading}
                        >
                          {actionLoading
                            ? 'Working...'
                            : 'Approve'}
                        </button>

                        <button
                          className="btn btn-small btn-danger"
                          onClick={() =>
                            handleRejectRequest(request.id)
                          }
                          disabled={actionLoading}
                        >
                          {actionLoading
                            ? 'Working...'
                            : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ marginTop: 16 }}>
            No pending API access requests.
          </p>
        )}
      </div>

        {newKey && (
          <div className="alert alert-success">
            New key created — copy it now, it won't be shown again:
            <br />
            <code>{newKey}</code>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Key</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {apiKeys.map((k) => (
              <tr key={k.id}>
                <td>{k.owner}</td>

                <td>
                  <code>{k.key.slice(0, 14)}…</code>
                </td>

                <td>
                  {k.active ? (
                    <span className="badge completed">
                      {k.isCurrent ? 'current' : 'active'}
                    </span>
                  ) : (
                    <span className="badge failed">
                      revoked
                    </span>
                  )}
                </td>

                <td>
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>

                <td>
                  {k.active && !k.isCurrent && (
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleRevoke(k.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Working...' : 'Revoke'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {apiKeys.length === 0 && (
          <p style={{ marginTop: 16 }}>
            No API keys found.
          </p>
        )}

        <form
          onSubmit={handleCreateKey}
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1 }}>
            <label>Issue key for</label>

            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. acme-integration"
              disabled={actionLoading}
            />
          </div>

          <button
            className="btn"
            type="submit"
            style={{ marginTop: 0 }}
            disabled={actionLoading}
          >
            {actionLoading ? 'Creating...' : 'Create Key'}
          </button>
        </form>
      </div>
    </div>
  );
}
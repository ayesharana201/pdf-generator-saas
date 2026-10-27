import { useState } from 'react';
import { api } from '../api/client.js';

export default function ApiAccessPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage(null);
    setSubmitting(true);

    try {
      await api.requestApiAccess({
        companyName,
        email,
        useCase,
      });

      setMessage({
        type: 'success',
        text: 'Your API access request has been submitted successfully.',
      });

      setCompanyName('');
      setEmail('');
      setUseCase('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to submit API access request.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">API ACCESS</div>

          <h1>Request API Access</h1>

          <p className="page-subtitle">
            Request API access for integrating PDF generation into your
            application or workflow.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span className="alert-icon">
            {message.type === 'success' ? '✓' : '!'}
          </span>

          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>API Access Request</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="api-company-name">
                Company Name
              </label>

              <input
                id="api-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                required
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label htmlFor="api-email">
                Email
              </label>

              <input
                id="api-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="api-use-case">
              Intended use
            </label>

            <textarea
              id="api-use-case"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="Describe how you plan to use the PDF generation API..."
              rows={6}
              required
              disabled={submitting}
            />
          </div>

          <button
            className="btn"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Request API Access'}
          </button>
        </form>
      </div>
    </div>
  );
}
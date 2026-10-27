import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function HistoryPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.listJobs();
      setJobs(res.jobs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRegenerate(id) {
    try {
      await api.regenerateJob(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1>Download History</h1>
      <p className="page-subtitle">All generation jobs, with regeneration and download access.</p>

      <div className="card">
        {loading && jobs.length === 0 ? (
          <div className="empty-state">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">No documents generated yet. Head to Generate to create your first PDF.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
                <th>Downloads</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title || <em>Untitled</em>}</td>
                  <td style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--muted)' }}>{job.sourceType}</td>
                  <td><span className={`badge ${job.status}`}>{job.status}</span></td>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                  <td>{job.downloadCount || 0}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {job.status === 'completed' && (
                      <button
  className="btn btn-small btn-secondary"
  onClick={async () => {
    try {
      await api.download(job.id);
    } catch (err) {
      alert(err.message);
    }
  }}
>
  Download
</button>
                    )}
                    <button className="btn btn-small btn-secondary" onClick={() => handleRegenerate(job.id)}>Regenerate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

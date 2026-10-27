import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const EMPTY_FORM = { name: '', kind: 'custom', companyName: '', primaryColor: '#1f3a5f', accentColor: '#e8ecf3' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);

  async function load() {
    const res = await api.listTemplates();
    setTemplates(res.templates);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.createTemplate({
        name: form.name,
        kind: form.kind,
        brand: { companyName: form.companyName, primaryColor: form.primaryColor, accentColor: form.accentColor },
      });
      setForm(EMPTY_FORM);
      setMessage({ type: 'success', text: 'Template created.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteTemplate(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1>Branding Templates</h1>
      <p className="page-subtitle">Reusable themes for manuals, brochures, and whitepapers — colors, fonts, and company identity.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="template-grid" style={{ marginBottom: 24 }}>
        {templates.map((t) => (
          <div className="template-card" key={t.id}>
            <div className="template-swatch" style={{ background: t.brand?.primaryColor || '#ccc' }} />
            <div className="template-body">
              <div className="template-name">{t.name}</div>
              <div className="template-kind">{t.kind}{t.builtIn ? ' · built-in' : ''}</div>
              {!t.builtIn && (
                <button className="btn btn-small btn-danger" style={{ marginTop: 10 }} onClick={() => handleDelete(t.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="card" onSubmit={handleCreate}>
        <h3 style={{ marginTop: 0 }}>New Template</h3>
        <label>Template Name</label>
        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Kind</label>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="whitepaper">Whitepaper</option>
          <option value="manual">Manual</option>
          <option value="brochure">Brochure</option>
          <option value="custom">Custom</option>
        </select>

        <label>Company Name</label>
        <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />

        <label>Primary Color</label>
        <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />

        <label>Accent Color</label>
        <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />

        <button className="btn" type="submit">Create Template</button>
      </form>
    </div>
  );
}

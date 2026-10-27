const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../storage/db');
const { requireAdminSession } = require('../middleware/auth');

const BUILT_IN_TEMPLATES = [
  {
    id: 'builtin-whitepaper',
    name: 'Corporate Whitepaper',
    kind: 'whitepaper',
    brand: { companyName: 'Your Company', primaryColor: '#1f3a5f', accentColor: '#e8ecf3', fontFamily: "'Georgia', serif" },
    footer: {},
    builtIn: true,
  },
  {
    id: 'builtin-manual',
    name: 'Technical Manual',
    kind: 'manual',
    brand: { companyName: 'Your Company', primaryColor: '#2b6e4f', accentColor: '#e6f2ec', fontFamily: "'Helvetica Neue', Arial, sans-serif" },
    footer: {},
    builtIn: true,
  },
  {
    id: 'builtin-brochure',
    name: 'Marketing Brochure',
    kind: 'brochure',
    brand: { companyName: 'Your Company', primaryColor: '#a13d63', accentColor: '#fbe9f0', fontFamily: "'Poppins', Arial, sans-serif" },
    footer: {},
    builtIn: true,
  },
];

function ensureBuiltIns() {
  const existing = db.all('templates');
  BUILT_IN_TEMPLATES.forEach((t) => {
    if (!existing.find((e) => e.id === t.id)) db.insert('templates', t);
  });
}
ensureBuiltIns();

// GET /api/templates
router.get('/templates', (req, res) => {
  res.json({ templates: db.all('templates') });
});

// POST /api/templates — create a custom branding template
router.post('/templates', requireAdminSession, (req, res) => {
  const { name, kind, brand, footer } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const template = db.insert('templates', {
    id: uuidv4(),
    name,
    kind: kind || 'custom',
    brand: brand || {},
    footer: footer || {},
    builtIn: false,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ template });
});

// PUT /api/templates/:id
router.put('/templates/:id', requireAdminSession, (req, res) => {
  const existing = db.findById('templates', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  if (existing.builtIn) return res.status(403).json({ error: 'Built-in templates cannot be edited. Create a new one instead.' });

  const updated = db.update('templates', req.params.id, {
    name: req.body.name ?? existing.name,
    brand: { ...existing.brand, ...(req.body.brand || {}) },
    footer: { ...existing.footer, ...(req.body.footer || {}) },
  });
  res.json({ template: updated });
});

// DELETE /api/templates/:id
router.delete('/templates/:id', requireAdminSession, (req, res) => {
  const existing = db.findById('templates', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  if (existing.builtIn) return res.status(403).json({ error: 'Built-in templates cannot be deleted.' });
  db.remove('templates', req.params.id);
  res.status(204).end();
});

module.exports = router;

/**
 * Lightweight file-backed store.
 * Swap this module for a Postgres/Mongo adapter in production —
 * every function here is intentionally small and isolated so the
 * storage layer can be replaced without touching routes/queue code.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DEFAULT_DATA = {
  jobs: [],             // generation job records
  templates: [],        // branding/layout templates
  apiKeys: [],          // issued API keys for programmatic access
  users: [],            // basic user/account records
  apiAccessRequests: [], // company requests for API access
};

function ensureDirs() {
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

function load() {
  ensureDirs();
  if (!fs.existsSync(config.dbFile)) {
    fs.writeFileSync(config.dbFile, JSON.stringify(DEFAULT_DATA, null, 2));
  }
  const raw = fs.readFileSync(config.dbFile, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { ...DEFAULT_DATA };
  }
}

function save(data) {
  fs.writeFileSync(config.dbFile, JSON.stringify(data, null, 2));
}

// --- generic helpers -------------------------------------------------

function all(collection) {
  return load()[collection] || [];
}

function findById(collection, id) {
  return all(collection).find((r) => r.id === id);
}

function insert(collection, record) {
  const data = load();
  data[collection] = data[collection] || [];
  data[collection].push(record);
  save(data);
  return record;
}

function update(collection, id, patch) {
  const data = load();
  const idx = (data[collection] || []).findIndex((r) => r.id === id);
  if (idx === -1) return null;
  data[collection][idx] = { ...data[collection][idx], ...patch, updatedAt: new Date().toISOString() };
  save(data);
  return data[collection][idx];
}

function remove(collection, id) {
  const data = load();
  data[collection] = (data[collection] || []).filter((r) => r.id !== id);
  save(data);
}

module.exports = { load, save, all, findById, insert, update, remove, ensureDirs };

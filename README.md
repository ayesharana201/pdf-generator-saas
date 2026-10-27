# Professional PDF eBook & Document Generator (SaaS)

A queue-driven PDF and eBook generation SaaS MVP that converts Markdown,
RSS feeds, and live web pages into styled, branded PDF documents.

The system uses Node.js, React, Puppeteer, Redis, and BullMQ. PDF rendering
runs in a separate worker process so that heavy Puppeteer workloads do not
block the main Express API.

---

## 1. Project Overview

The Professional PDF eBook & Document Generator converts:

- Markdown documents
- RSS feeds
- Live webpage URLs

into professionally styled PDF documents with:

- Branded cover pages
- Dynamic table of contents
- Custom branding
- Headers and footers
- Dynamic page numbering
- Templates
- Batch generation
- Download history
- PDF regeneration
- API access
- Redis-backed background rendering
- Admin queue and API-key management

The implementation follows the architecture and feature requirements defined
in the project specification:

**Professional PDF eBook & Document Generator (SaaS)**

---

## 2. Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express.js
- EJS
- File-backed JSON storage

### PDF Generation

- Puppeteer
- Chromium

### Background Processing

- Redis
- BullMQ
- Standalone Node.js rendering worker

### Authentication & API Protection

- API-key authentication
- `x-api-key` HTTP header
- `express-rate-limit`

### Development Environment

- Docker / Docker Compose
- Redis container

---

## 3. System Architecture

The application separates API request handling from heavy PDF rendering.

```text
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │      Vite           │
                    └──────────┬──────────┘
                               │
                               │ HTTP / REST API
                               ▼
                    ┌─────────────────────┐
                    │    Express API      │
                    │    Node.js          │
                    └──────────┬──────────┘
                               │
                               │ Create job
                               ▼
                    ┌─────────────────────┐
                    │   BullMQ / Redis    │
                    │     Job Queue       │
                    └──────────┬──────────┘
                               │
                               │ Job
                               ▼
                    ┌─────────────────────┐
                    │ Standalone Worker   │
                    │     Node.js         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Puppeteer       │
                    │     Chromium        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PDF Output      │
                    │   storage/output    │
                    └─────────────────────┘
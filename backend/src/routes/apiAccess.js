const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const db = require('../storage/db');
const { requireBrowserSession } = require('../middleware/auth');

// POST /api/api-access/request
router.post(
  '/api-access/request',
  requireBrowserSession,
  (req, res) => {
    const {
      companyName,
      contactName,
      email,
      useCase,
      expectedVolume,
    } = req.body || {};

    if (!companyName || !email || !useCase) {
      return res.status(400).json({
        error: 'companyName, email, and useCase are required.',
      });
    }

    const request = db.insert('apiAccessRequests', {
      id: uuidv4(),
      browserSessionId: req.browserSessionId,
      companyName: companyName.trim(),
      contactName: contactName?.trim() || '',
      email: email.trim(),
      useCase: useCase.trim(),
      expectedVolume: expectedVolume?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'API access request submitted successfully.',
      requestId: request.id,
    });
  }
);

// GET /api/api-access/requests
router.get(
  '/api-access/requests',
  requireBrowserSession,
  (req, res) => {
    const requests = db
      .all('apiAccessRequests')
      .filter(
        (request) =>
          request.browserSessionId === req.browserSessionId
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .map((request) => {
        const result = {
          id: request.id,
          companyName: request.companyName,
          email: request.email,
          useCase: request.useCase,
          expectedVolume: request.expectedVolume,
          status: request.status,
          createdAt: request.createdAt,
          approvedAt: request.approvedAt || null,
          rejectedAt: request.rejectedAt || null,
          rejectionReason:
            request.rejectionReason || null,
        };

        if (request.status === 'approved' && request.apiKeyId) {
          const apiKey = db.findById(
            'apiKeys',
            request.apiKeyId
          );

          if (apiKey && apiKey.active !== false) {
            result.apiKey = apiKey.key;
          }
        }

        return result;
      });

    res.json({ requests });
  }
);

module.exports = router;
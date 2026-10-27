const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../storage/db');
const config = require('../config');

function getCookie(req, name) {
  const header = req.headers.cookie;

  if (!header) return null;

  const prefix = `${name}=`;

  const part = header
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  if (!part) return null;

  return decodeURIComponent(part.slice(prefix.length));
}
function requireBrowserSession(req, res, next) {
  let token = getCookie(req, 'browser_session');

  if (!token) {
    const sessionId = crypto.randomUUID();

    token = jwt.sign(
      {
        sub: sessionId,
        role: 'browser',
      },
      config.jwtSecret,
      {
        expiresIn: '30d',
      }
    );

    const secure = config.nodeEnv === 'production';

    const cookieParts = [
      `browser_session=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/api',
      'SameSite=Lax',
      'Max-Age=2592000',
    ];

    if (secure) {
      cookieParts.push('Secure');
    }

    res.setHeader('Set-Cookie', cookieParts.join('; '));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.role !== 'browser' || !payload.sub) {
      return res.status(401).json({
        error: 'Invalid browser session.',
      });
    }

    req.browserSessionId = payload.sub;
    req.authMethod = 'browser-session';

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired browser session.',
    });
  }
}

function requireApiKey(req, res, next) {
  const key = req.header(config.apiKeyHeader) || req.query.apiKey;

  if (!key) {
    return res.status(401).json({
      error: `Missing API key. Send it in the "${config.apiKeyHeader}" header.`,
    });
  }

  const record = db.all('apiKeys').find(
    (k) => k.key === key && k.active !== false
  );

  if (!record) {
    return res.status(401).json({
      error: 'Invalid or revoked API key.',
    });
  }

  req.apiKeyOwner = record.owner;
  req.apiKeyRole = record.role || 'integration';
  req.apiKeyId = record.id;
  req.apiKeyRecord = record;
  req.authMethod = 'api-key';

  next();
}

function requireAdmin(req, res, next) {
  if (req.apiKeyRole !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required.',
    });
  }

  next();
}

function requireAdminSession(req, res, next) {
  const token = getCookie(req, 'admin_session');

  if (!token) {
    return res.status(401).json({
      error: 'Admin session required.',
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.role !== 'admin') {
      return res.status(401).json({
        error: 'Invalid admin session.',
      });
    }

    req.apiKeyOwner = 'admin';
    req.apiKeyRole = 'admin';
    req.apiKeyId = null;
    req.apiKeyRecord = null;
    req.authMethod = 'admin-session';

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired admin session.',
    });
  }
}

function checkQuota(requiredUnits = 1) {
  return (req, res, next) => {
    if (
      req.apiKeyRole === 'admin' ||
      req.authMethod === 'browser-session'
    ) {
      return next();
    }

    const key = db.findById('apiKeys', req.apiKeyId);

    if (!key) {
      return res.status(401).json({
        error: 'API key not found.',
      });
    }

    const now = Date.now();
    const windowDays = config.quota.windowDays;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    let usageCount = Number(key.usageCount || 0);

    let usageStartedAt = key.usageStartedAt
      ? new Date(key.usageStartedAt).getTime()
      : now;

    if (!Number.isFinite(usageStartedAt)) {
      usageStartedAt = now;
    }

    if (now - usageStartedAt >= windowMs) {
      usageCount = 0;
      usageStartedAt = now;
    }

    const monthlyLimit = Number(
      key.monthlyLimit || config.quota.monthlyLimit
    );

    if (usageCount + requiredUnits > monthlyLimit) {
      return res.status(429).json({
        error: 'API key quota exceeded.',
        usage: usageCount,
        limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - usageCount),
      });
    }

    req.apiKeyUsage = {
      usageCount,
      monthlyLimit,
      remaining: Math.max(
        0,
        monthlyLimit - usageCount
      ),
      usageStartedAt: new Date(
        usageStartedAt
      ).toISOString(),
      windowDays,
    };

    next();
  };
}

module.exports = {
  requireApiKey,
  requireAdmin,
  requireAdminSession,
  requireBrowserSession,
  checkQuota,
};
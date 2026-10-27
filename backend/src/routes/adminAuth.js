const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const config = require('../config');

function setAdminCookie(res, token) {
  const secure = config.nodeEnv === 'production';

  const cookieParts = [
    `admin_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/api',
    'SameSite=Lax',
    `Max-Age=${config.adminSessionTtl}`,
  ];

  if (secure) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function clearAdminCookie(res) {
  const secure = config.nodeEnv === 'production';

  const cookieParts = [
    'admin_session=',
    'HttpOnly',
    'Path=/api',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (secure) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

router.post('/admin/login', (req, res) => {
  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({
      error: 'Password is required.',
    });
  }

  if (!config.adminPassword) {
    return res.status(500).json({
      error: 'Admin authentication is not configured.',
    });
  }

  if (password !== config.adminPassword) {
    return res.status(401).json({
      error: 'Invalid admin password.',
    });
  }

  const token = jwt.sign(
    {
      sub: 'admin',
      role: 'admin',
    },
    config.jwtSecret,
    {
      expiresIn: config.adminSessionTtl,
    }
  );

  setAdminCookie(res, token);

  res.json({
    success: true,
    message: 'Admin login successful.',
  });
});

router.post('/admin/logout', (req, res) => {
  clearAdminCookie(res);

  res.json({
    success: true,
    message: 'Admin logout successful.',
  });
});

module.exports = router;
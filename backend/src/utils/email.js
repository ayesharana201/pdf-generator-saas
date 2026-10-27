const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: String(SMTP_SECURE).toLowerCase() === 'true',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendApiApprovalEmail({
  companyName,
  requesterEmail,
  useCase,
  apiKey,
}) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email notification is not configured.');
  }

  await transporter.sendMail({
    from: SMTP_USER,
    to: requesterEmail,
    subject: `API Access Approved - ${companyName}`,
    text: [
      'API Access Request Approved',
      '',
      `Company: ${companyName}`,
      `Email: ${requesterEmail}`,
      `Use Case: ${useCase || 'Not provided'}`,
      '',
      `API Key: ${apiKey}`,
      '',
      'Please keep this API key secure.',
    ].join('\n'),
  });
}

module.exports = {
  sendApiApprovalEmail,
};
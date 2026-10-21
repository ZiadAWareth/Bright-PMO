import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'integration.sendEmail',
  category: 'integration',
  label: 'Send Email',
  description: 'Sends an email. Optionally supply your own SMTP connection; blank fields fall back to the system SMTP.',
  icon: 'mail',
  async: 'always',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'to', label: 'To', type: 'recipient', required: true, help: 'Recipient email (supports {{variables}}).' },
  { key: 'subject', label: 'Subject', type: 'string', required: true },
  { key: 'body', label: 'Body (HTML)', type: 'code', help: 'HTML body; supports {{variables}}.' },
  { key: 'ctaUrl', label: 'Button link', type: 'string', help: 'Optional call-to-action button URL (supports {{variables}}). Renders a branded button under the body.' },
  { key: 'ctaLabel', label: 'Button label', type: 'string', help: 'Text for the call-to-action button (e.g. "Answer the questions").' },
  { key: 'cc', label: 'Cc', type: 'string' },
  { key: 'bcc', label: 'Bcc', type: 'string' },
  { key: 'from', label: 'From', type: 'string', help: 'Override sender; blank = system default.' },
  // ── SMTP connector (optional; falls back to the system SMTP / .env) ──
  { key: 'smtpHost', label: 'SMTP host', type: 'string', help: 'Leave blank to use the system SMTP.' },
  { key: 'smtpPort', label: 'SMTP port', type: 'number' },
  { key: 'smtpUser', label: 'SMTP user', type: 'string' },
  { key: 'smtpPass', label: 'SMTP password', type: 'string' },
  { key: 'smtpSecure', label: 'Use TLS (secure)', type: 'boolean' },
];

export const io: PulseIO = {
  inputs: [{ key: 'to', label: 'Recipient' }],
  outputs: [{ key: 'sent', label: 'Whether the email was sent' }],
};

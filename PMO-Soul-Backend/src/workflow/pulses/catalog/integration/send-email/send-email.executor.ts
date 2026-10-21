import type { PulseExecutor } from '../../../core';

/**
 * Sends an email via the injected `sendEmail` service port. If any SMTP field is
 * supplied it is passed as a per-send override; the service impl falls back to the
 * system SMTP (.env) for anything left blank. Templates are resolved by the wrapper.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.sendEmail) {
    return { error: { name: 'MailUnavailable', message: 'No email service is configured.' } };
  }
  const to = String(inputs.to ?? '').trim();
  if (!to) return { error: { name: 'MissingRecipient', message: 'Send Email requires a recipient.' } };

  const hasSmtp = Boolean(inputs.smtpHost || inputs.smtpUser || inputs.smtpPass);
  const smtp = hasSmtp
    ? {
        host: inputs.smtpHost ? String(inputs.smtpHost) : undefined,
        port: inputs.smtpPort != null && inputs.smtpPort !== '' ? Number(inputs.smtpPort) : undefined,
        user: inputs.smtpUser ? String(inputs.smtpUser) : undefined,
        pass: inputs.smtpPass ? String(inputs.smtpPass) : undefined,
        secure: Boolean(inputs.smtpSecure),
      }
    : undefined;

  const ctaUrl = inputs.ctaUrl ? String(inputs.ctaUrl).trim() : '';
  const cta = ctaUrl ? { url: ctaUrl, label: String(inputs.ctaLabel ?? 'Open').trim() || 'Open' } : undefined;

  const result = await ctx.services.sendEmail({
    to,
    subject: String(inputs.subject ?? ''),
    html: inputs.body != null ? String(inputs.body) : undefined,
    cta,
    cc: inputs.cc ? String(inputs.cc) : undefined,
    bcc: inputs.bcc ? String(inputs.bcc) : undefined,
    from: inputs.from ? String(inputs.from) : undefined,
    smtp,
  });

  // G5 — mail that did not go out is a FAILED step, not a successful one with sent:false buried in
  // its output. Returning outputs here marked the run green while nothing was delivered, which is
  // exactly the silent failure G5 exists to prevent. The sandbox (Test step) is the one exception:
  // it captures mail on purpose and must not fail the test.
  const via = result?.via ?? 'unknown';
  if (!result?.sent && via !== 'sandbox') {
    return {
      error: {
        name: 'MailNotSent',
        message:
          via === 'no-smtp-configured'
            ? 'No email was sent: this app has no mail server. Configure SMTP on the Sign-in & Email page, or fill in this step\'s SMTP fields.'
            : 'No email was sent (' + via + ').',
      },
    };
  }

  // G5 — report what the transport actually did. Hardcoding sent:true meant a
  // no-op or failed send looked identical to a delivered one, and downstream
  // nodes acted on a false premise.
  return { outputs: { sent: result?.sent ?? false, via, to } };
};

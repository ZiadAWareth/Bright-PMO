/**
 * A workflow "Send email" step's message, in the app's ONE email layout (src/mail/email-layout.ts).
 *
 * G15 — the app's name, colour and logo come from APP_NAME / APP_PRIMARY_COLOR / APP_LOGO_URL,
 * never a literal: a hardcoded product name meant every generated app sent mail branded as another
 * company's product.
 *
 * The authored body is the step's own HTML, written by the app's administrator in the designer, so
 * it is inserted as trusted HTML. The logo is not attached here: MailService embeds it (or the app's
 * typeset name) for every email laid out with it — workflow mail, invitations and sign-in codes alike.
 */
import { renderAppEmail as renderLayout } from 'src/mail/email-brand';

export interface AppEmailOptions {
  subject: string;
  bodyHtml: string;
  cta?: { url: string; label: string } | null;
}

/** The full email HTML and its plain-text part, around an authored body fragment. */
export function renderAppEmail({ subject, bodyHtml, cta }: AppEmailOptions): { html: string; text: string } {
  return renderLayout({
    title: subject,
    preheader: subject,
    heading: subject,
    // A workflow body usually opens with its own salutation, so the layout does not add one.
    greeting: null,
    bodyHtml: bodyHtml || '',
    button: cta && cta.url ? { label: cta.label || 'Open', url: cta.url } : null,
  });
}

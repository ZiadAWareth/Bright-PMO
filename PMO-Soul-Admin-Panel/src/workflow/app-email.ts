/**
 * The workflow designer's email preview, rendered with the SAME layout recipients receive:
 * ./email-layout.ts is a copy of the backend's src/mail/email-layout.ts, from one generator source,
 * so "what you preview" is "what is sent".
 *
 * Branding comes from the app's own env (VITE_APP_NAME / VITE_APP_PRIMARY_COLOR / the brand logo),
 * never a hardcoded product name — the generator enforces this (rule G15). The logo is a normal URL
 * here: the preview renders in a browser iframe, where the sent email embeds it inline instead.
 */
import { renderEmail } from './email-layout';

export interface AppEmailOptions {
  subject: string;
  bodyHtml: string;
  logoSrc?: string;
  cta?: { url: string; label: string } | null;
}

const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) || {};

export function renderAppEmail({ subject, bodyHtml, logoSrc, cta }: AppEmailOptions): string {
  return renderEmail(
    {
      title: subject,
      preheader: subject,
      heading: subject,
      greeting: null,
      bodyHtml: bodyHtml || '',
      button: cta && cta.url ? { label: cta.label || 'Open', url: cta.url } : null,
    },
    {
      name: env.VITE_APP_NAME || 'App',
      primary: env.VITE_APP_PRIMARY_COLOR || null,
      logoSrc: logoSrc || env.VITE_BRAND_LOGO_URL || env.VITE_BRAND_ICON_URL || null,
    },
  ).html;
}

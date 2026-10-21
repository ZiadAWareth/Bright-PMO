/**
 * The app's brand, for its emails: name, primary colour and logo, from the app's own environment.
 *
 *   APP_NAME           the app's name (header fallback, footer, plain text)
 *   APP_PRIMARY_COLOR  #rrggbb — buttons, accent bar and links follow the app's theme
 *   APP_LOGO_URL       the logo image; embedded in each email inline (cid:app-logo)
 *   APP_SUPPORT_EMAIL  optional — shown in the footer as "Need a hand?"
 *
 * The logo travels as an INLINE attachment, not a remote <img> URL: Outlook desktop and Apple Mail
 * (Protect Mail Activity) block remote images until the reader opts in, which would make the header
 * a broken-image box on first open. It is fetched once and cached; MailService attaches it to any
 * email whose layout asks for it, and swaps in the typeset app name if no usable image is available.
 */
import { APP_LOGO_CID, LOGO_END, LOGO_START, renderEmail, wordmark, type EmailBrand, type EmailContent } from './email-layout';

export function appBrand(): EmailBrand {
  return {
    name: (process.env.APP_NAME || '').trim() || 'App',
    primary: (process.env.APP_PRIMARY_COLOR || '').trim() || null,
    logoSrc: (process.env.APP_LOGO_URL || '').trim() ? 'cid:' + APP_LOGO_CID : null,
    supportEmail: (process.env.APP_SUPPORT_EMAIL || '').trim() || null,
  };
}

/** Any message, in the app's layout and brand. */
export function renderAppEmail(content: EmailContent): { html: string; text: string } {
  return renderEmail(content, appBrand());
}

// ── the logo image ───────────────────────────────────────────────────────────────────────────

interface LogoImage {
  content: Buffer;
  contentType: string;
  filename: string;
}

/** Formats every mail client shows. SVG and WebP are not among them (Gmail, Outlook desktop). */
const SUPPORTED: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' };
const MAX_BYTES = 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;
/** A good logo is kept an hour (so a new one is picked up without a restart); a failure, ten minutes. */
const KEEP_OK_MS = 60 * 60 * 1000;
const KEEP_FAILED_MS = 10 * 60 * 1000;

let cache: { url: string; image: LogoImage | null; until: number } | null = null;

/** The logo, ready to attach — or null (no URL, unreachable, too large, or a format mail cannot show). */
export async function loadAppLogo(): Promise<LogoImage | null> {
  const url = (process.env.APP_LOGO_URL || '').trim();
  if (!url) return null;
  if (cache && cache.url === url && Date.now() < cache.until) return cache.image;

  let image: LogoImage | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const type = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (res.ok && SUPPORTED[type]) {
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length > 0 && bytes.length <= MAX_BYTES) {
          image = { content: bytes, contentType: type, filename: 'logo.' + SUPPORTED[type] };
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    image = null;
  }
  cache = { url, image, until: Date.now() + (image ? KEEP_OK_MS : KEEP_FAILED_MS) };
  return image;
}

/**
 * Make an outgoing email's branding real: attach the logo when the layout asked for it, or replace
 * the logo plate with the typeset app name when there is no usable image — never a broken image.
 */
export async function withAppLogo<T extends { html?: string; attachments?: Array<Record<string, unknown>> }>(message: T): Promise<T> {
  const html = message.html || '';
  if (!html.includes('cid:' + APP_LOGO_CID)) return message;
  if ((message.attachments || []).some((a) => a && (a as { cid?: string }).cid === APP_LOGO_CID)) return message;

  const logo = await loadAppLogo();
  if (logo) {
    return {
      ...message,
      attachments: [
        ...(message.attachments || []),
        // Inline, or some clients list the logo as a file the message carries.
        { filename: logo.filename, content: logo.content, contentType: logo.contentType, cid: APP_LOGO_CID, contentDisposition: 'inline' },
      ],
    };
  }
  const start = html.indexOf(LOGO_START);
  const end = html.indexOf(LOGO_END);
  if (start < 0 || end < start) return message;
  return { ...message, html: html.slice(0, start + LOGO_START.length) + wordmark(appBrand()) + html.slice(end) };
}

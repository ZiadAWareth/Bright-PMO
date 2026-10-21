/**
 * The app's email layout — ONE structure for every message the app sends: invitations, password
 * resets, sign-in codes, security notices, test messages and every workflow "Send email" step.
 *
 * Generated file, shipped twice from one source (Soul generator: shared-templates/email-layout.ts):
 *   backend      src/mail/email-layout.ts      what recipients get
 *   admin panel  src/workflow/email-layout.ts  the workflow designer's email preview
 * so what is previewed is what is sent. Change the source, not a copy.
 *
 * Built for real email clients, not browsers:
 *  - table layout (Outlook renders with Word: no flex, no grid)
 *  - every style inline (Gmail strips <style> in places); the <style> block only ADDS dark mode
 *    and small-screen tweaks for clients that honour it
 *  - a hidden preheader, so the inbox preview reads well
 *  - no emoji, no SVG, no data: images: tone markers are table-drawn text glyphs
 *  - the logo is the one image, on a white plate (dark-mode safe), delivered inline by the caller
 *  - a text/plain version of everything, for deliverability and screen readers
 *
 * Pure: no imports, no environment. The caller passes the brand.
 */

export type EmailTone = 'info' | 'warning' | 'success' | 'danger';

export interface EmailBrand {
  /** The app's name: header fallback, footer, plain text. */
  name: string;
  /** The app's primary colour (#rrggbb). Buttons, accent bar, links follow it. */
  primary?: string | null;
  /** The logo's <img src>: 'cid:app-logo' in a sent email, a URL in a preview, or null for the typeset name. */
  logoSrc?: string | null;
  /** Shown in the footer when set. */
  supportEmail?: string | null;
}

export interface EmailContent {
  /** The document <title>. */
  title: string;
  /** The inbox preview line. */
  preheader: string;
  heading: string;
  /** "Hi there," by default; null leaves the greeting out. */
  greeting?: string | null;
  /** Body paragraphs — plain text, escaped here. */
  paragraphs?: string[];
  /** TRUSTED body HTML, inserted as is (a workflow body the app's own administrator wrote). */
  bodyHtml?: string;
  /** A large status disc above a centred heading (e.g. a security notice). */
  statusIcon?: EmailTone;
  /** A one-time code, drawn as boxed digits with a plain-text fallback line. */
  code?: string;
  /** Under the code or the button, e.g. "This code expires in 10 minutes." */
  note?: string;
  button?: { label: string; url: string } | null;
  /** The tinted note under the main content. Plain text. */
  panel?: { tone: EmailTone; title: string; body: string } | null;
  /** 'warning' ends the accent bar in amber: a security-sensitive action, at a glance. */
  accent?: 'brand' | 'warning';
  /** Small print after the divider. Plain text. */
  footnote?: string;
  /** Shown raw after the footnote — the button's link, for when the button does not work. */
  footnoteLink?: string;
  /** The first footer line. Defaults to "This is an automated message from <app>. Please don't reply to it." */
  footer?: string;
}

/** Where a sent email's logo is fetched from: MailService attaches the image under this id. */
export const APP_LOGO_CID = 'app-logo';
/** Wraps the logo plate, so the sender can swap in the typeset name when no image can be attached. */
export const LOGO_START = '<!--soul:logo-->';
export const LOGO_END = '<!--/soul:logo-->';

// ── colour ─────────────────────────────────────────────────────────────────────────────────────

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const FALLBACK_PRIMARY = '#0f766e';
const WARNING = '#db7706';

const TEXT_STRONG = '#1a1d26';
const TEXT_MUTED = '#5a6070';
const TEXT_FAINT = '#8a90a0';
const PAGE_BG = '#f5f6fa';
const BORDER = '#e4e8f0';
const PANEL_BG = '#f7f9fc';

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

/** The brand colour and the shades derived from it, like an app's --primary / -dark / -light tokens. */
function palette(primary?: string | null) {
  const base = hexToHsl(primary || '') ? String(primary).trim() : FALLBACK_PRIMARY;
  const [h, s, l] = hexToHsl(base) as [number, number, number];
  return {
    brand: base.startsWith('#') ? base : '#' + base,
    dark: hslToHex(h, s, Math.max(0.12, l - 0.08)),
    light: hslToHex(h, s, Math.min(0.62, l + 0.08)),
    onDark: hslToHex(h, Math.min(1, s + 0.05), Math.max(0.55, Math.min(0.7, l + 0.25))),
    tint: hslToHex(h, Math.min(0.6, s), 0.94),
  };
}

const esc = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ── tone markers (text glyphs, never emoji) ──────────────────────────────────────────────────

const GLYPHS: Record<EmailTone, string> = { info: 'i', warning: '!', success: '&#10003;', danger: '&#215;' };

function tones(p: ReturnType<typeof palette>): Record<EmailTone, { bg: string; fg: string }> {
  return {
    info: { bg: p.tint, fg: p.dark },
    success: { bg: p.tint, fg: p.brand },
    warning: { bg: '#fdf0d5', fg: '#8a6116' },
    danger: { bg: '#fbe9e9', fg: '#a32020' },
  };
}

function badge(tone: EmailTone, p: ReturnType<typeof palette>, size = 20): string {
  const t = tones(p)[tone];
  const italic = tone === 'info' ? 'font-style:italic;font-family:Georgia,serif;' : '';
  return '<span class="icon-' + tone + '" style="display:inline-block;width:' + size + 'px;height:' + size + 'px;line-height:' + size +
    'px;border-radius:' + size + 'px;background:' + t.bg + ';color:' + t.fg + ';font-family:' + FONT + ';font-size:' +
    Math.round(size * 0.62) + 'px;font-weight:700;text-align:center;vertical-align:middle;' + italic + '">' + GLYPHS[tone] + '</span>';
}

function disc(tone: EmailTone, p: ReturnType<typeof palette>, size = 56): string {
  const t = tones(p)[tone];
  return '<div class="icon-' + tone + '" style="width:' + size + 'px;height:' + size + 'px;line-height:' + size + 'px;border-radius:' +
    size + 'px;background:' + t.bg + ';color:' + t.fg + ';font-family:' + FONT + ';font-size:' + Math.round(size * 0.5) +
    'px;font-weight:700;text-align:center;">' + GLYPHS[tone] + '</div>';
}

// ── the header lockup ────────────────────────────────────────────────────────────────────────

/** The app name, typeset in the brand colour: the header when there is no logo image. */
export function wordmark(brand: EmailBrand): string {
  const p = palette(brand.primary);
  return '<span style="font-family:' + FONT + ';font-size:22px;font-weight:800;letter-spacing:-0.02em;color:' + p.brand + ';">' +
    esc(brand.name || 'App') + '</span>';
}

/**
 * The logo on a white plate: a table cell with bgcolor, because Outlook honours bgcolor where it
 * ignores CSS backgrounds, and the plate is what keeps a dark logo readable in a dark-mode client.
 */
function logoPlate(brand: EmailBrand): string {
  if (!brand.logoSrc) return wordmark(brand);
  const p = palette(brand.primary);
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;padding:12px 18px;box-shadow:0 4px 14px rgba(15,23,42,0.08);">' +
    '<img src="' + esc(brand.logoSrc) + '" height="40" alt="' + esc(brand.name || 'App') + '" style="display:block;height:40px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none;font-family:' +
    FONT + ';font-size:20px;font-weight:800;color:' + p.brand + ';" />' +
    '</td></tr></table>';
}

// ── the email ────────────────────────────────────────────────────────────────────────────────

const PX = 'padding-left:44px;padding-right:44px;';

export function renderEmail(content: EmailContent, brand: EmailBrand): { html: string; text: string } {
  const p = palette(brand.primary);
  const name = esc(brand.name || 'App');
  const year = new Date().getFullYear();
  const accent = content.accent === 'warning'
    ? 'linear-gradient(90deg,' + p.dark + ' 0%,' + p.brand + ' 50%,' + WARNING + ' 100%)'
    : 'linear-gradient(90deg,' + p.dark + ' 0%,' + p.brand + ' 50%,' + p.light + ' 100%)';
  const centred = Boolean(content.statusIcon);
  const greeting = content.greeting === null ? '' : content.greeting || 'Hi there,';

  const rows: string[] = [];

  if (content.statusIcon) {
    rows.push('<tr><td align="center" style="padding:36px 44px 0 44px;">' + disc(content.statusIcon, p) + '</td></tr>');
  }

  // Heading, greeting, intro
  const intro = (content.paragraphs || [])
    .map((para) => '<p class="text-muted" style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:' + TEXT_MUTED + ';">' + esc(para) + '</p>')
    .join('');
  rows.push(
    '<tr><td class="px"' + (centred ? ' align="center"' : '') + ' style="padding-top:' + (centred ? '20px' : '40px') + ';padding-bottom:8px;' + PX +
      'font-family:' + FONT + ';">' +
      '<h1 class="text-strong" style="margin:0 0 8px 0;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:' + TEXT_STRONG + ';">' +
      esc(content.heading) + '</h1>' +
      (greeting ? '<p class="text-muted" style="margin:0;font-size:15px;line-height:1.6;color:' + TEXT_MUTED + ';">' + esc(greeting) + '</p>' : '') +
      intro +
      '</td></tr>',
  );

  if (content.bodyHtml) {
    rows.push('<tr><td class="px text-muted" style="padding-top:8px;' + PX + 'font-family:' + FONT + ';font-size:15px;line-height:1.6;color:' +
      TEXT_MUTED + ';">' + content.bodyHtml + '</td></tr>');
  }

  if (content.code) {
    const digits = String(content.code).split('').map((d) =>
      '<td align="center" style="padding:0 4px;"><div class="digit" style="width:44px;height:56px;line-height:56px;background:#ffffff;border:1px solid ' +
        BORDER + ';border-radius:10px;font-family:' + MONO + ';font-size:26px;font-weight:700;color:' + p.dark + ';">' + esc(d) + '</div></td>',
    ).join('');
    rows.push(
      '<tr><td align="center" style="padding:28px 24px 8px 24px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' + digits + '</tr></table>' +
        (content.note ? '<p class="text-muted" style="margin:16px 0 0 0;font-family:' + FONT + ';font-size:13px;color:' + TEXT_MUTED + ';">' + esc(content.note) + '</p>' : '') +
        '</td></tr>',
    );
  }

  if (content.button && content.button.url) {
    rows.push(
      '<tr><td align="center" style="padding:28px 44px 0 44px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td align="center" bgcolor="' + p.brand + '" style="border-radius:11px;background:linear-gradient(135deg,' + p.brand + ' 0%,' + p.light + ' 100%);">' +
        '<a href="' + esc(content.button.url) + '" target="_blank" style="display:inline-block;padding:13px 28px;font-family:' + FONT +
        ';font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:11px;">' + esc(content.button.label) + '</a>' +
        '</td></tr></table>' +
        (content.note && !content.code ? '<p class="text-muted" style="margin:14px 0 0 0;font-family:' + FONT + ';font-size:13px;color:' + TEXT_MUTED + ';">' + esc(content.note) + '</p>' : '') +
        '</td></tr>',
    );
  }

  if (content.panel) {
    const warn = content.panel.tone === 'warning' || content.panel.tone === 'danger';
    rows.push(
      '<tr><td class="px" style="padding-top:24px;' + PX + '">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="' + (warn ? 'alert' : 'panel') + '" style="background:' +
        (warn ? '#fdf6e7' : PANEL_BG) + ';border:1px solid ' + (warn ? '#f0d9a8' : BORDER) + ';border-radius:12px;"><tr>' +
        '<td style="padding:16px 18px;font-family:' + FONT + ';">' +
        '<p class="text-strong" style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:' + TEXT_STRONG + ';">' + badge(content.panel.tone, p) +
        '&nbsp;&nbsp;' + esc(content.panel.title) + '</p>' +
        '<p class="text-muted" style="margin:0;font-size:13px;line-height:1.6;color:' + TEXT_MUTED + ';">' + esc(content.panel.body) + '</p>' +
        '</td></tr></table></td></tr>',
    );
  }

  if (content.footnote || content.code) {
    const fallback = content.code
      ? 'Trouble reading the boxes? Your code is <span style="font-family:' + MONO + ';font-weight:700;letter-spacing:0.12em;color:' + p.dark + ';">' +
        esc(content.code) + '</span>.'
      : '';
    const link = content.footnoteLink
      ? '<br><a href="' + esc(content.footnoteLink) + '" style="color:' + p.brand + ';text-decoration:none;word-break:break-all;">' + esc(content.footnoteLink) + '</a>'
      : '';
    rows.push('<tr><td class="px" style="padding-top:28px;' + PX + '"><div class="divider" style="border-top:1px solid ' + BORDER +
      ';font-size:0;line-height:0;">&nbsp;</div></td></tr>');
    rows.push('<tr><td class="px" style="padding-top:20px;padding-bottom:40px;' + PX + 'font-family:' + FONT + ';">' +
      '<p class="text-muted" style="margin:0;font-size:13px;line-height:1.6;color:' + TEXT_MUTED + ';">' +
      (content.footnote ? esc(content.footnote) : fallback) + link + '</p></td></tr>');
  } else {
    rows.push('<tr><td style="padding-bottom:40px;font-size:0;line-height:0;">&nbsp;</td></tr>');
  }

  const footer = content.footer || 'This is an automated message from ' + (brand.name || 'App') + ". Please don't reply to it.";
  const support = brand.supportEmail
    ? '<p class="text-muted" style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:' + TEXT_FAINT + ';">Need a hand? <a href="mailto:' +
      esc(brand.supportEmail) + '" style="color:' + p.brand + ';text-decoration:none;">' + esc(brand.supportEmail) + '</a></p>'
    : '';

  const html = '<!doctype html>\n' +
    '<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<meta name="x-apple-disable-message-reformatting">\n<meta name="color-scheme" content="light dark">\n' +
    '<meta name="supported-color-schemes" content="light dark">\n<title>' + esc(content.title) + '</title>\n' +
    '<!--[if mso]>\n<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>\n<![endif]-->\n' +
    '<style>\n' +
    '  @media (prefers-color-scheme: dark) {\n' +
    '    .bg-page { background:#0e1117 !important; }\n' +
    '    .bg-card { background:#161b26 !important; border-color:#2a3242 !important; }\n' +
    '    .text-strong { color:#e4e7ed !important; }\n' +
    '    .text-muted { color:#8b93a6 !important; }\n' +
    '    .digit { background:#0e1117 !important; border-color:#2a3242 !important; color:' + p.onDark + ' !important; }\n' +
    '    .divider { border-color:#2a3242 !important; }\n' +
    '    .panel { background:#1c2231 !important; border-color:#2a3242 !important; }\n' +
    '    .alert { background:#2a1f14 !important; border-color:#5c4420 !important; }\n' +
    '    .icon-info, .icon-success { background:#12312a !important; color:' + p.onDark + ' !important; }\n' +
    '    .icon-warning { background:#33280f !important; color:#e0b055 !important; }\n' +
    '    .icon-danger { background:#3a1b1b !important; color:#e08b8b !important; }\n' +
    '  }\n' +
    '  @media only screen and (max-width:600px) {\n' +
    '    .container { width:100% !important; }\n' +
    '    .px { padding-left:24px !important; padding-right:24px !important; }\n' +
    '    .digit { width:38px !important; font-size:22px !important; }\n' +
    '  }\n' +
    '</style>\n</head>\n' +
    '<body class="bg-page" style="margin:0;padding:0;background:' + PAGE_BG + ';">\n' +
    '  <div style="display:none;font-size:1px;color:' + PAGE_BG + ';line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">' +
    esc(content.preheader) + ' &#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;</div>\n' +
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background:' + PAGE_BG + ';">\n' +
    '    <tr><td align="center" style="padding:40px 16px;">\n' +
    '      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px;max-width:600px;">\n' +
    '        <tr><td align="center" style="padding:0 0 28px 0;">' + LOGO_START + logoPlate(brand) + LOGO_END + '</td></tr>\n' +
    '        <tr><td class="bg-card" style="background:#ffffff;border:1px solid ' + BORDER + ';border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06);">\n' +
    '          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:4px;background:' + accent +
    ';font-size:0;line-height:0;">&nbsp;</td></tr></table>\n' +
    '          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' + rows.join('\n') + '\n          </table>\n' +
    '        </td></tr>\n' +
    '        <tr><td align="center" style="padding:24px 16px 0 16px;font-family:' + FONT + ';">' +
    '<p class="text-muted" style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:' + TEXT_FAINT + ';">' + esc(footer) + '</p>' + support +
    '<p class="text-muted" style="margin:0;font-size:12px;color:' + TEXT_FAINT + ';">&copy; ' + year + ' ' + name + '. All rights reserved.</p>' +
    '</td></tr>\n' +
    '      </table>\n    </td></tr>\n  </table>\n</body>\n</html>';

  return { html, text: renderText(content, brand) };
}

/** The text/plain alternative: the same message, in the same order. */
function renderText(content: EmailContent, brand: EmailBrand): string {
  const appName = brand.name || 'App';
  const lines: string[] = [appName + ' — ' + content.heading, ''];
  const greeting = content.greeting === null ? '' : content.greeting || 'Hi there,';
  if (greeting) lines.push(greeting, '');
  for (const para of content.paragraphs || []) lines.push(para, '');
  if (content.bodyHtml) lines.push(htmlToText(content.bodyHtml), '');
  if (content.code) lines.push('    ' + content.code, '');
  if (content.button && content.button.url) lines.push(content.button.label + ': ' + content.button.url, '');
  if (content.note) lines.push(content.note, '');
  if (content.panel) lines.push(content.panel.title.toUpperCase(), content.panel.body, '');
  if (content.footnote) lines.push(content.footnote + (content.footnoteLink ? ' ' + content.footnoteLink : ''), '');
  lines.push('© ' + new Date().getFullYear() + ' ' + appName + '. This is an automated message.');
  return lines.join('\n');
}

/** Authored HTML as readable text (for the text/plain part only). */
export function htmlToText(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

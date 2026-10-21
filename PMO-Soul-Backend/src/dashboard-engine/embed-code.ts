/**
 * Reading the embed code a person copies from the Dashboard Engine.
 *
 * A plain module (no Nest, no Prisma) so it can be tested on its own.
 *
 * WHAT PEOPLE PASTE
 * The engine's "Embed" dialog produces an <iframe src="…/embed/dashboard/<id>?…&token=…"> snippet.
 * People also paste just the address. Both are accepted. Only the parts this app needs are kept:
 *   - where the engine is (its origin) and which dashboard (or single widget) it is;
 *   - the few display options the engine understands (theme, hide title/filters/edit, refresh);
 *   - the access token, returned SEPARATELY so the caller can store it encrypted and never echo it.
 * Anything else in the snippet (scripts, other attributes, unknown parameters) is discarded, so a
 * pasted snippet can never inject markup into the app: the app always builds its own iframe.
 */

export type EmbedKind = 'dashboard' | 'widget';

export interface EmbedOptions {
  theme?: 'light' | 'dark' | 'auto';
  hideTitle?: boolean;
  hideFilters?: boolean;
  hideEdit?: boolean;
  /** Seconds between automatic refreshes; 0 or absent = off. */
  autoRefresh?: number;
  /** Preferred height in pixels, when the snippet gave one. */
  height?: number;
}

export interface ParsedEmbed {
  kind: EmbedKind;
  /** The dashboard (or widget) ID in the engine. */
  engineId: string;
  /** The engine's web origin, e.g. https://dashboards.example.com */
  origin: string;
  options: EmbedOptions;
  /** The engine embed token carried by the snippet, or null when it had none. Never stored in clear. */
  token: string | null;
}

export class EmbedCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbedCodeError';
  }
}

const MAX_INPUT = 20_000;
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const PATH_PATTERN = /^\/embed\/(dashboard|widget)\/([^/?#]+)\/?$/;
const TOKEN_PATTERN = /^[A-Za-z0-9\-_.~+/=]{10,4096}$/;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** The src of the first <iframe> in a snippet, or the input itself when it is not HTML. */
function addressFrom(input: string): string {
  const text = input.trim();
  if (/<iframe\b/i.test(text)) {
    const tag = text.match(/<iframe\b[^>]*>/i)?.[0] ?? '';
    const src = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = src?.[1] ?? src?.[2] ?? src?.[3];
    if (!value) throw new EmbedCodeError('That embed code has no address in it. Copy the whole code from the Dashboard Engine again.');
    // Snippets are often pasted with the address split over several lines.
    return decodeEntities(value).replace(/\s+/g, '');
  }
  if (/[<>]/.test(text)) {
    throw new EmbedCodeError('Paste the embed code (it starts with <iframe) or the dashboard\'s embed address.');
  }
  return text.replace(/\s+/g, '');
}

function heightFrom(input: string): number | undefined {
  const tag = input.match(/<iframe\b[^>]*>/i)?.[0];
  const raw = tag?.match(/\sheight\s*=\s*["']?(\d{2,5})(?:px)?["']?/i)?.[1];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 200 && value <= 4000 ? value : undefined;
}

const truthy = (v: string | null) => v === 'true' || v === '1';

/** Parse a pasted embed code or embed address. Throws EmbedCodeError with a person-readable message. */
export function parseEmbedCode(input: unknown): ParsedEmbed {
  if (typeof input !== 'string' || !input.trim()) {
    throw new EmbedCodeError('Paste the embed code from the Dashboard Engine.');
  }
  if (input.length > MAX_INPUT) {
    throw new EmbedCodeError('That is too long to be an embed code. Copy just the embed code from the Dashboard Engine.');
  }

  let url: URL;
  try {
    url = new URL(addressFrom(input));
  } catch {
    throw new EmbedCodeError('That does not look like a Dashboard Engine embed code. Copy it again from the dashboard\'s Embed dialog.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new EmbedCodeError('The embed address must start with https://.');
  }
  if (url.username || url.password) {
    throw new EmbedCodeError('That embed address carries a user name or password. Copy the embed code again from the Dashboard Engine.');
  }

  const match = url.pathname.match(PATH_PATTERN);
  if (!match) {
    throw new EmbedCodeError('That address is not a dashboard embed. In the Dashboard Engine, open the dashboard, choose Embed, and copy the code.');
  }
  const kind = match[1] as EmbedKind;
  let engineId: string;
  try {
    engineId = decodeURIComponent(match[2]);
  } catch {
    throw new EmbedCodeError('The dashboard ID in that code is not valid.');
  }
  if (!ID_PATTERN.test(engineId) || engineId === 'YOUR_DASHBOARD_ID') {
    throw new EmbedCodeError('The dashboard ID in that code is not valid. Copy the code from the dashboard itself.');
  }

  const q = url.searchParams;
  const options: EmbedOptions = {};
  const theme = q.get('theme');
  if (theme === 'light' || theme === 'dark' || theme === 'auto') options.theme = theme;
  if (truthy(q.get('hideTitle'))) options.hideTitle = true;
  if (truthy(q.get('hideFilters'))) options.hideFilters = true;
  if (truthy(q.get('hideEdit'))) options.hideEdit = true;
  const refresh = Number(q.get('autoRefresh'));
  if (Number.isInteger(refresh) && refresh > 0 && refresh <= 86_400) options.autoRefresh = refresh;
  const height = heightFrom(input);
  if (height) options.height = height;

  // The token may sit in the query (?token=) or, in newer engines, the fragment (#token=).
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const rawToken = (q.get('token') || fragment.get('token') || '').trim();
  if (rawToken && !TOKEN_PATTERN.test(rawToken)) {
    throw new EmbedCodeError('The access token in that code is damaged. Copy the code again from the Dashboard Engine.');
  }
  // The engine's dialog shows a shortened token followed by "…" — that is not a usable token.
  if (rawToken && /\.\.\.$|…$/.test(rawToken)) {
    throw new EmbedCodeError('That code shows a shortened token. Copy the full embed code from the Dashboard Engine.');
  }

  return { kind, engineId, origin: url.origin, options, token: rawToken || null };
}

/** The address of the engine's embed page for a stored dashboard. Never includes a token. */
export function embedAddress(origin: string, kind: EmbedKind, engineId: string, options: EmbedOptions): URL {
  const url = new URL(`/embed/${kind}/${encodeURIComponent(engineId)}`, origin);
  if (options.theme) url.searchParams.set('theme', options.theme);
  if (options.hideTitle) url.searchParams.set('hideTitle', 'true');
  if (options.hideFilters) url.searchParams.set('hideFilters', 'true');
  if (options.hideEdit) url.searchParams.set('hideEdit', 'true');
  if (options.autoRefresh) url.searchParams.set('autoRefresh', String(options.autoRefresh));
  return url;
}

/** Same origin? Compared on the parsed origin, so trailing slashes and case never matter. */
export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

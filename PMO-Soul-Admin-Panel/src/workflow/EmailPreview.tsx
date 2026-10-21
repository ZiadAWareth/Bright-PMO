import { useState } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { interpolate } from './pulse-data';
import { renderAppEmail } from './app-email';

/**
 * Full email preview. Resolves {{variables}} against the available data, renders
 * an HTML body in a sandboxed iframe (or plain text in a mono block), and offers a
 * raw/rendered toggle so you can preview either form.
 */
export default function EmailPreview({
  to,
  subject,
  body,
  vars,
  onClose,
}: {
  to: string;
  subject: string;
  body: string;
  vars: Record<string, unknown>;
  onClose: () => void;
}) {
  const rTo = interpolate(to, vars);
  const rSubject = interpolate(subject, vars);
  const rBody = interpolate(body, vars);
  const looksHtml = /<[a-z][\s\S]*>/i.test(rBody);
  const [raw, setRaw] = useState(false);
  // The email adapts to the reader's light / dark setting, and an iframe follows the COMPUTER's —
  // so a dark-mode PC showed the dark email in a light app. Shown in the app's own theme, with a
  // switch, since recipients' mail apps differ.
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  // Render the body inside the SAME layout recipients receive, so the preview is faithful. The
  // app's own logo (the wide one, as in sent mail), not a product-specific asset.
  const logoSrc = (import.meta as any).env?.VITE_BRAND_LOGO_URL || (import.meta as any).env?.VITE_BRAND_ICON_URL || undefined;
  const srcDoc = forceScheme(renderAppEmail({ subject: rSubject || 'Email', bodyHtml: rBody, logoSrc }), theme);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Email preview</p>
          <div className="flex items-center gap-2">
            {!raw && looksHtml ? (
              <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Preview as">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  title="As a recipient in light mode sees it"
                  className={'grid h-7 w-8 place-items-center ' + (theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span className="sr-only">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  title="As a recipient in dark mode sees it"
                  className={'grid h-7 w-8 place-items-center ' + (theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span className="sr-only">Dark</span>
                </button>
              </div>
            ) : null}
            <div className="flex overflow-hidden rounded-md border border-border text-[12px]">
              <button type="button" onClick={() => setRaw(false)} className={raw ? 'px-2 py-1 text-muted-foreground' : 'bg-primary px-2 py-1 text-primary-foreground'}>
                Rendered
              </button>
              <button type="button" onClick={() => setRaw(true)} className={raw ? 'bg-primary px-2 py-1 text-primary-foreground' : 'px-2 py-1 text-muted-foreground'}>
                Raw
              </button>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-1 border-b border-border bg-muted/20 px-4 py-3 text-[13px]">
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">To</span>
            <span className="min-w-0 truncate text-foreground">{rTo || <span className="text-muted-foreground">—</span>}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">Subject</span>
            <span className="min-w-0 truncate font-medium text-foreground">{rSubject || <span className="text-muted-foreground">—</span>}</span>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto bg-white">
          {raw || !looksHtml ? (
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12.5px] text-slate-800">{rBody || '(empty body)'}</pre>
          ) : (
            <iframe title="Email body" sandbox="" className="h-full w-full border-0" srcDoc={srcDoc} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The email exactly as built, with its light / dark choice made for the preview: its
 * (prefers-color-scheme: dark) rules always apply (dark) or never do (light), whatever the
 * computer is set to.
 */
function forceScheme(html: string, theme: 'light' | 'dark'): string {
  return html
    .replace(/\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g, theme === 'dark' ? 'all' : 'not all')
    .replace(/(<meta name="(?:color-scheme|supported-color-schemes)" content=")[^"]*"/g, '$1' + theme + '"');
}

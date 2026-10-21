import { Fragment, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ListItem = { depth: number; marker: string; text: string };
type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'rule' }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  | { kind: 'table'; head: string[]; align: Array<'left' | 'center' | 'right'>; rows: string[][] };

const FENCE = /^\s*(\x60{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function cellsOf(row: string): string[] {
  let r = row.trim();
  if (r.startsWith('|')) r = r.slice(1);
  if (r.endsWith('|')) r = r.slice(0, -1);
  return r.split('|').map((c) => c.trim());
}

function startsBlock(line: string, next: string | undefined): boolean {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || BULLET.test(line) ||
    ORDERED.test(line) || QUOTE.test(line) || (line.includes('|') && !!next && TABLE_DIVIDER.test(next));
}

/** Markdown text → blocks. Tolerant: anything it does not recognise stays a paragraph. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) { body.push(lines[i]); i += 1; }
      i += 1; // the closing fence (or the end of an answer that never closed it)
      blocks.push({ kind: 'code', lang: fence[2] || '', text: body.join('\n') });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (RULE.test(line)) { blocks.push({ kind: 'rule' }); i += 1; continue; }

    if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const head = cellsOf(line);
      const align = cellsOf(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left') as Array<'left' | 'center' | 'right'>;
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) { rows.push(cellsOf(lines[i])); i += 1; }
      blocks.push({ kind: 'table', head, align, rows });
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) { quoted.push((lines[i].match(QUOTE) as RegExpMatchArray)[1]); i += 1; }
      blocks.push({ kind: 'quote', lines: quoted });
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = ORDERED.test(line);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const b = current.match(BULLET);
        const o = current.match(ORDERED);
        if (b || o) {
          const indent = (b ? b[1] : (o as RegExpMatchArray)[1]).replace(/\t/g, '  ').length;
          items.push({ depth: Math.min(3, Math.floor(indent / 2)), marker: o ? o[2] + '.' : '', text: b ? b[3] : (o as RegExpMatchArray)[3] });
          i += 1;
        } else if (current.trim() && /^\s+/.test(current) && items.length) {
          items[items.length - 1].text += ' ' + current.trim(); // a wrapped item continues
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i], lines[i + 1]))) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', lines: para });
  }
  return blocks;
}

/** Only addresses that cannot run anything: web, mail, and paths inside this app. */
function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h) || (h.startsWith('/') && !h.startsWith('//')) || h.startsWith('#')) return h;
  return null;
}

const INLINE = /(\x60+)(.+?)\1|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Inline Markdown → React nodes: code, bold, italic, strikethrough and links. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE.source, 'g');
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = key + '.' + n;
    n += 1;
    if (m[1]) {
      out.push(<code key={k} className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.85em]">{m[2]}</code>);
    } else if (m[3] !== undefined || m[4] !== undefined) {
      out.push(<strong key={k} className="font-semibold text-foreground">{inline(m[3] ?? m[4], k)}</strong>);
    } else if (m[5] !== undefined) {
      out.push(<del key={k}>{inline(m[5], k)}</del>);
    } else if (m[6] !== undefined || m[7] !== undefined) {
      out.push(<em key={k}>{inline(m[6] ?? m[7], k)}</em>);
    } else if (m[8] !== undefined) {
      const href = safeHref(m[9]);
      out.push(href ? (
        <a key={k} href={href} target={/^https?:/i.test(href) ? '_blank' : undefined} rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2">{inline(m[8], k)}</a>
      ) : <Fragment key={k}>{m[8]}</Fragment>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS = ['text-lg', 'text-base', 'text-[15px]', 'text-sm', 'text-sm', 'text-sm'];
const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

function renderBlock(block: Block, index: number): ReactNode {
  const k = 'b' + index;
  switch (block.kind) {
    case 'heading': {
      const Tag = (block.level <= 2 ? 'h3' : block.level === 3 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5';
      return <Tag key={k} className={cn('font-semibold tracking-tight text-foreground', HEADING_CLASS[block.level - 1])}>{inline(block.text, k)}</Tag>;
    }
    case 'paragraph':
      return (
        <p key={k}>
          {block.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, k + '.' + j)}</Fragment>)}
        </p>
      );
    case 'code':
      return (
        <pre key={k} className="overflow-x-auto rounded-md border bg-background/80 p-3 font-mono text-[12.5px] leading-relaxed">
          <code>{block.text}</code>
        </pre>
      );
    case 'rule':
      return <hr key={k} className="border-border" />;
    case 'quote':
      return (
        <blockquote key={k} className="border-l-2 border-primary/40 pl-3 text-muted-foreground">
          {block.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, k + '.' + j)}</Fragment>)}
        </blockquote>
      );
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List key={k} className="space-y-1">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-2" style={{ marginLeft: item.depth * 18 }}>
              <span aria-hidden="true" className={cn('shrink-0 text-muted-foreground', item.marker ? 'min-w-[1.25rem] tabular-nums' : 'pl-0.5')}>
                {item.marker || '•'}
              </span>
              <span className="min-w-0">{inline(item.text, k + '.' + j)}</span>
            </li>
          ))}
        </List>
      );
    }
    case 'table':
      return (
        <div key={k} className="overflow-x-auto rounded-md border bg-background/60">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-muted/60">
              <tr>
                {block.head.map((h, j) => (
                  <th key={j} scope="col" className={cn('whitespace-nowrap px-3 py-2 font-semibold text-foreground', ALIGN_CLASS[block.align[j] || 'left'])}>
                    {inline(h, k + '.h' + j)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t">
                  {block.head.map((_, j) => (
                    <td key={j} className={cn('px-3 py-2 align-top', ALIGN_CLASS[block.align[j] || 'left'])}>
                      {inline(row[j] ?? '', k + '.' + r + '.' + j)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** An assistant answer, rendered: headings, lists, tables, code and links, styled for the chat. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text || ''), [text]);
  return <div className={cn('min-w-0 space-y-3 leading-relaxed', className)}>{blocks.map(renderBlock)}</div>;
}

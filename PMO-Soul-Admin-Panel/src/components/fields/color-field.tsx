import { Input } from '@/components/ui/input';

const FULL_HEX = /^#[0-9a-fA-F]{6}$/;

function toHex(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Edit control: a color swatch (native picker) kept in sync with a hex text box,
 * so a value can be picked visually or typed. Stores an uppercase hex string.
 */
export function ColorChooser({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: string) => void;
}) {
  const hex = toHex(value);
  const valid = FULL_HEX.test(hex);
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative h-9 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
        title="Pick a color"
      >
        <span
          className="absolute inset-0"
          style={{ backgroundColor: valid ? hex : 'transparent' }}
        />
        <input
          type="color"
          value={valid ? hex : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Pick a color"
        />
      </label>
      <Input
        value={hex}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (v && !v.startsWith('#')) v = '#' + v;
          onChange(v.toUpperCase());
        }}
        placeholder="#0F766E"
        maxLength={7}
        className="font-mono"
      />
    </div>
  );
}

/** Display: a swatch chip followed by the hex code (a dash when empty). */
export function ColorViewer({ value }: { value: unknown }) {
  const hex = toHex(value);
  if (!hex) return <span className="text-muted-foreground">—</span>;
  const valid = FULL_HEX.test(hex);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-4 w-4 shrink-0 rounded border border-border"
        style={{ backgroundColor: valid ? hex : 'transparent' }}
      />
      <span className="font-mono text-xs">{hex}</span>
    </span>
  );
}

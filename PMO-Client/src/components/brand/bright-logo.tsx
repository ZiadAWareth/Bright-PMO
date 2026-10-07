import { cn } from '@/lib/utils';

/**
 * The Bright product wordmark. The source PNG is on a white background, so it is
 * always presented on a white "logo chip" — invisible on light surfaces, a clean
 * brand card on dark ones. This is our product identity and is shown regardless of
 * which tenant is signed in (the tenant's own logo lives in the top bar).
 */
export function BrightLogo({
  className,
  imgClassName,
  alt = 'Bright',
}: {
  className?: string;
  imgClassName?: string;
  alt?: string;
}) {
  return (
    <span className={cn('inline-flex items-center justify-center overflow-hidden rounded-[10px] bg-surface', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Bright-Logo-New.png" alt={alt} className={cn('w-auto object-contain', imgClassName)} />
    </span>
  );
}

/** The compact Bright "B" mark (self-contained orange tile) — used where a square
 *  brand glyph is needed, e.g. the collapsed sidebar. */
export function BrightMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/favicon/bright-favicon.svg" alt="Bright" className={cn('block', className)} />
  );
}

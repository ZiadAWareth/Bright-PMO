"use client";

import { cn, initials, avatarColor } from "@/lib/utils";

/**
 * Circular avatar — an uploaded photo when there is one, otherwise coloured
 * initials on a colour derived from the name.
 */
export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        className,
      )}
      style={src ? undefined : { background: avatarColor(name) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/**
 * The standard way to show a person in a table cell: avatar plus name, with an
 * em-dash when the field is empty.
 *
 * Takes the person directly rather than an id and a lookup hook, because the
 * API already embeds `account.first_name` / `last_name` on the rows that need
 * this — adding a second fetch keyed by id would be a round trip for data the
 * row is holding.
 */
export function PersonCell({
  name,
  email,
  avatarUrl,
  subtitle,
  className,
}: {
  /** Display name. Empty or nullish renders the em-dash placeholder. */
  name?: string | null;
  /** Shown as the hover title, since it rarely fits in a column. */
  email?: string | null;
  avatarUrl?: string | null;
  /** Optional second line, e.g. a role. */
  subtitle?: string | null;
  className?: string;
}) {
  const display = name?.trim();
  if (!display) return <span className="text-faint">—</span>;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <UserAvatar
        name={display}
        src={avatarUrl}
        className="h-[26px] w-[26px] text-[10.5px]"
      />
      <div className="min-w-0">
        <div className="truncate text-[13.5px] text-ink" title={email ?? undefined}>
          {display}
        </div>
        {subtitle && (
          <div className="truncate text-[11.5px] text-faint">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Builds a display name from the `account` shape the API returns on user
 * relations, falling back to the username when the account record is absent.
 */
export function personName(user?: {
  username?: string | null;
  account?: { first_name?: string | null; last_name?: string | null } | null;
} | null): string {
  if (!user) return "";
  const first = user.account?.first_name?.trim() ?? "";
  const last = user.account?.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || user.username?.trim() || "";
}

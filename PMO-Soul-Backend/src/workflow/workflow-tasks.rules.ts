/** A person's display name for the task console: name fields when the User model has them, else email, else id. */
export function displayName(user: any): string {
  if (!user) return '';
  const full = [user.firstName, user.lastName].filter((p) => typeof p === 'string' && p.trim()).join(' ').trim();
  const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : full;
  return name || (typeof user.email === 'string' ? user.email : String(user.id ?? ''));
}

/**
 * Does the task match the console's assignee filter? A number is a user id that must be among
 * the assignees; anything else is matched, case-insensitively, against the resolved names/emails.
 */
export function matchesAssignee(
  task: { assigneeUserIds?: number[] | null; assigneeNames?: string[] | null },
  filter?: string,
): boolean {
  const q = String(filter ?? '').trim();
  if (!q) return true;
  if (/^\d+$/.test(q)) return (task.assigneeUserIds ?? []).map(Number).includes(Number(q));
  const needle = q.toLowerCase();
  return (task.assigneeNames ?? []).some((n) => String(n).toLowerCase().includes(needle));
}

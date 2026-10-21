import type { PulseWorkflowDefinition, PulseNode } from './pulses/core/graph';
import type { ManifestEntry } from './graph-rules';

/** A role in the caller's organisation and how many users hold it. */
export interface RoleMembership {
  name: string;
  members: number;
}

/** One "role:<name>" reference found in a recipient field of the graph. */
export interface RoleReference {
  node: PulseNode;
  /** The node's display name, quoted, as the messages print it. */
  label: string;
  key: string;
  role: string;
}

/** Roles are matched trimmed and case-insensitively — the same way the runner resolves them. */
export const normalizeRoleName = (name: string): string => String(name ?? '').trim().toLowerCase();

const isTemplate = (value: unknown): boolean => typeof value === 'string' && /\{\{[\s\S]*\}\}/.test(value);

/**
 * The role names one recipient value addresses. A value may mix "role:A; role:B; 12; a@b.c"
 * (the runner's resolver reads the same list); user ids, emails, templates and blanks yield none.
 */
export function roleTokens(value: unknown): string[] {
  if (typeof value !== 'string' || isTemplate(value)) return [];
  const out: string[] = [];
  for (const part of value.split(/[;,]/)) {
    const m = /^\s*role:\s*(.+?)\s*$/i.exec(part);
    if (m && m[1]) out.push(m[1]);
  }
  return out;
}

/** Every role reference in every field whose descriptor is of type 'recipient'. */
export function roleReferences(
  definition: PulseWorkflowDefinition | null | undefined,
  pulses: ManifestEntry[],
): RoleReference[] {
  const byType = new Map((pulses ?? []).map((p) => [p.meta.type, p]));
  const refs: RoleReference[] = [];
  for (const node of definition?.nodes ?? []) {
    const fields = (node.type ? byType.get(node.type)?.config : undefined) ?? [];
    for (const field of fields) {
      if (field.type !== 'recipient') continue;
      const value = (node.config as Record<string, unknown> | undefined)?.[field.key];
      for (const role of roleTokens(value)) {
        refs.push({ node, label: '"' + (node.label || node.id) + '"', key: field.key, role });
      }
    }
  }
  return refs;
}

/**
 * Every recipient problem that stops this definition from running. Empty means it may go live.
 * A role that does not exist is named with the roles that do; a role nobody holds is refused
 * too, because the task it creates would sit in nobody's inbox.
 */
export function assigneeProblems(
  definition: PulseWorkflowDefinition | null | undefined,
  pulses: ManifestEntry[],
  roles: RoleMembership[],
): string[] {
  const byName = new Map(roles.map((r) => [normalizeRoleName(r.name), r]));
  const known = roles.map((r) => r.name).filter((n) => n && n.trim());
  const list = known.length ? known.join(', ') : 'none';
  const problems: string[] = [];
  for (const ref of roleReferences(definition, pulses)) {
    const match = byName.get(normalizeRoleName(ref.role));
    if (!match) {
      problems.push(
        'Node ' + ref.label + ' is assigned to role "' + ref.role + '", which does not exist in this organisation (roles: ' + list + ').',
      );
    } else if (!(match.members > 0)) {
      problems.push(
        'Node ' + ref.label + ' is assigned to role "' + ref.role + '", but no user holds that role yet — the task would sit in nobody\'s inbox.',
      );
    }
  }
  return problems;
}

/**
 * Client-safe mirrors of the Prisma enums.
 *
 * Importing enums from `@prisma/client` inside a client component pulls the
 * Prisma runtime into the client compilation graph, which slows dev compilation
 * and bloats the bundle. These objects carry the same names and values as the
 * generated enums, so they can be used both as types and as runtime values
 * (`Object.values(ProjectStatus)`) without reaching for the Prisma client.
 *
 * Values are mirrored from `prisma/schema.prisma` — keep them in sync when the
 * schema enums change.
 */

export const ProjectStatus = {
  planning: 'planning',
  execution: 'execution',
  completed: 'completed',
  closed: 'closed',
  on_hold: 'on_hold',
  pending_approval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const;
export type ProjectPriority = (typeof ProjectPriority)[keyof typeof ProjectPriority];

export const PortfolioStatus = {
  active: 'active',
  completed: 'completed',
  on_hold: 'on_hold',
  archived: 'archived',
} as const;
export type PortfolioStatus = (typeof PortfolioStatus)[keyof typeof PortfolioStatus];

export const PortfolioPriority = {
  high: 'high',
  medium: 'medium',
  low: 'low',
} as const;
export type PortfolioPriority = (typeof PortfolioPriority)[keyof typeof PortfolioPriority];

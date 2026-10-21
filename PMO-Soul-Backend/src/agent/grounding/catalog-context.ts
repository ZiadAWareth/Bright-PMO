import { hash32 } from './schema-context';

/** Shape returned by ApisIntrospectorService.getRoutes(). */
export interface RouteInput {
  controller: string;
  methodName: string;
  httpMethod: string | string[];
  path: string;
  requiresAuth?: boolean;
  body?: unknown;
  params?: unknown[];
  queries?: unknown[];
}

/** Shape returned by PulseRegistry.manifest(). */
export interface PulseManifestInput {
  meta: {
    type: string;
    category: string;
    label: string;
    description: string;
    hasSideEffects?: boolean;
  };
}

export interface RouteContext {
  method: string;
  path: string;
  /** Entity the route most likely operates on, inferred from the controller name. Lets the agent
   *  connect "create a ticket" to POST /ticket without being told the mapping. */
  entity?: string;
  operation: 'list' | 'read' | 'create' | 'update' | 'delete' | 'other';
  /** True for anything that changes state. The read-only phases filter on exactly this. */
  mutates: boolean;
  requiresAuth: boolean;
}

export interface PulseContext {
  type: string;
  category: string;
  label: string;
  description: string;
  hasSideEffects: boolean;
}

export interface CatalogContext {
  routes: RouteContext[];
  pulses: PulseContext[];
  fingerprint: string;
}

export interface BuildCatalogContextOptions {
  /** Path prefixes to omit — internal plumbing the agent has no business describing. */
  excludePathPrefixes?: string[];
}

const DEFAULT_EXCLUDED_PREFIXES = ['/internal', '/agent', '/__'];

/**
 * Last path segments that READ despite sitting behind a POST.
 *
 * A fold ("what is the total, filtered like this") needs a request body, so it has to be a POST —
 * and the verb alone would classify it as 'create'. That matters twice: a read-only consumer filters
 * on `mutates` and would hide it, while a consumer that builds forms from POST routes would offer a
 * "create" form for /order/aggregate. It changes nothing, and says so.
 */
const READ_ONLY_POST_SEGMENTS = ['aggregate'];

function isReadOnlyPost(method: string, path: string): boolean {
  if (method !== 'POST') return false;
  const segments = path.split('?')[0].split('/').filter(Boolean);
  // More than one segment, because the fold always hangs off an entity: a customer model actually
  // NAMED Aggregate is served at POST /aggregate, and that one really does create a row.
  if (segments.length < 2) return false;
  return READ_ONLY_POST_SEGMENTS.includes(segments[segments.length - 1]);
}

export function buildCatalogContext(
  routes: readonly RouteInput[],
  pulses: readonly PulseManifestInput[],
  options: BuildCatalogContextOptions = {},
): CatalogContext {
  const excluded = options.excludePathPrefixes || DEFAULT_EXCLUDED_PREFIXES;

  const shaped: RouteContext[] = [];
  for (const route of routes) {
    const path = normalizePath(route.path);
    if (excluded.some((prefix) => path.startsWith(prefix))) continue;

    // A route can be registered for several verbs; each verb is a distinct capability.
    const methods = Array.isArray(route.httpMethod) ? route.httpMethod : [route.httpMethod];
    for (const raw of methods) {
      const method = String(raw || '').toUpperCase();
      if (!method || method === 'OPTIONS' || method === 'HEAD') continue;
      const readOnlyPost = isReadOnlyPost(method, path);
      shaped.push({
        method,
        path,
        entity: entityFromController(route.controller),
        operation: readOnlyPost ? 'other' : classifyOperation(method, path),
        mutates: method !== 'GET' && !readOnlyPost,
        requiresAuth: route.requiresAuth !== false,
      });
    }
  }

  shaped.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  const shapedPulses: PulseContext[] = pulses
    .map((pulse) => ({
      type: pulse.meta.type,
      category: pulse.meta.category,
      label: pulse.meta.label,
      description: pulse.meta.description,
      hasSideEffects: Boolean(pulse.meta.hasSideEffects),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  return {
    routes: shaped,
    pulses: shapedPulses,
    fingerprint: hash32(
      [
        ...shaped.map((route) => `${route.method} ${route.path}`),
        ...shapedPulses.map((pulse) => pulse.type),
      ].join('|'),
    ),
  };
}

/** `TicketController` -> `Ticket`. Undefined when the controller is not entity-shaped. */
function entityFromController(controller: string): string | undefined {
  const name = (controller || '').replace(/Controller$/, '');
  return name && name !== 'App' && name !== 'Auth' ? name : undefined;
}

/**
 * Maps a verb + path to the same vocabulary the permission layer uses (`list`/`read`/`create`/
 * `update`/`delete`). Sharing the vocabulary is the point: the pack can then be filtered by what
 * the current user may actually do, with no translation table in between.
 */
function classifyOperation(method: string, path: string): RouteContext['operation'] {
  const hasIdParam = /:[a-zA-Z_]\w*/.test(path);
  switch (method) {
    case 'GET':
      return hasIdParam ? 'read' : 'list';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'other';
  }
}

function normalizePath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

import { ForbiddenException, SetMetadata } from '@nestjs/common';

/** Where a role keeps its feature switches, inside its permission JSON. */
export const FEATURES_KEY = '$features';

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  route: string;
  /** How a role saved before this switch existed is treated. */
  legacy: 'admin' | 'everyone';
}

/** Generated from the Soul generator's app-features.js. The only list. */
export const FEATURES: FeatureDef[] = [
  {
    "key": "designFrontend",
    "label": "Design frontend",
    "description": "Open the UI Builder to design the pages this app's customers see.",
    "route": "/design-frontend",
    "legacy": "admin"
  },
  {
    "key": "signInSettings",
    "label": "Sign-in & email",
    "description": "Change how people sign in and how this app sends email.",
    "route": "/settings/sign-in",
    "legacy": "admin"
  },
  {
    "key": "aiSettings",
    "label": "AI provider & agents",
    "description": "Set the AI provider and key, and create, change or delete agents.",
    "route": "/agent/settings",
    "legacy": "admin"
  },
  {
    "key": "connections",
    "label": "Connections",
    "description": "Connect this app to outside systems used by workflow steps.",
    "route": "/settings/connections",
    "legacy": "admin"
  },
  {
    "key": "assistant",
    "label": "Use the assistant",
    "description": "Chat with the in-app AI assistant. Every question uses AI credit.",
    "route": "/agent/assistant",
    "legacy": "everyone"
  },
  {
    "key": "dynamicDashboards",
    "label": "Dynamic dashboards",
    "description": "Open the Dashboard Engine dashboards shared with your organization.",
    "route": "/analytics/dynamic-dashboards",
    "legacy": "everyone"
  },
  {
    "key": "manageDynamicDashboards",
    "label": "Manage dynamic dashboards",
    "description": "Turn dashboards on for your organization and add or remove its dashboards. The app owner also connects the Dashboard Engine here.",
    "route": "/settings/dashboard-engine",
    "legacy": "admin"
  }
];

export type FeatureKey = string;

/**
 * May a person with these permissions use this feature?
 *
 * The platform operator always may. A role that has the switch saved decides with it. A role
 * saved before the switch existed keeps its old behaviour (see FeatureDef.legacy), so nobody's
 * access changes on redeploy.
 */
export function hasFeatureIn(
  permissions: Record<string, any> | null | undefined,
  isPlatformAdmin: boolean | undefined,
  key: FeatureKey,
): boolean {
  if (isPlatformAdmin) return true;
  const switches = permissions?.[FEATURES_KEY];
  if (switches && typeof switches === 'object' && key in switches) {
    return switches[key] === true;
  }
  const def = FEATURES.find((f) => f.key === key);
  if (def?.legacy === 'everyone') return true;
  return Boolean(permissions?.rolesandpermissions?.update);
}

/** Request-shaped input: what AuthGuard puts on the request. */
interface FeatureRequest {
  userPermissions?: Record<string, any>;
  isPlatformAdmin?: boolean;
}

/** May the signed-in person behind this request use the feature? */
export function hasFeature(request: FeatureRequest | null | undefined, key: FeatureKey): boolean {
  return hasFeatureIn(request?.userPermissions, request?.isPlatformAdmin, key);
}

/**
 * Refuse unless the person may use the feature. `message` names what was refused in the
 * person's words; the default names the switch, so an administrator knows what to turn on.
 */
export function assertFeature(
  request: FeatureRequest | null | undefined,
  key: FeatureKey,
  message?: string,
): void {
  if (hasFeature(request, key)) return;
  const label = FEATURES.find((f) => f.key === key)?.label || key;
  throw new ForbiddenException(
    message || `Your role does not have access to "${label}". Ask an administrator to turn it on in Roles & Permissions.`,
  );
}

/**
 * Route form of assertFeature, enforced by PermissionsGuard:
 *   @UseGuards(AuthGuard, PermissionsGuard)
 *   @RequireFeature('designFrontend')
 */
export const RequireFeature = (key: FeatureKey) => SetMetadata('feature', key);

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from './auth';

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

/** May the signed-in person use this feature? Same answer the backend gives. */
export function useFeature(key: FeatureKey): boolean {
  const { user } = useAuth();
  return hasFeatureIn(user?.permissions, user?.isPlatformAdmin, key);
}

/**
 * Wrap a feature's route. A person without the switch who follows a link sees why, instead of a
 * screen whose every request fails.
 */
export function RequireFeature({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const allowed = useFeature(feature);
  if (allowed) return <>{children}</>;
  const label = FEATURES.find((f) => f.key === feature)?.label || feature;
  return (
    <div className="grid h-full min-h-[50vh] place-items-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">You don't have access to {label}</h1>
        <p className="text-sm text-muted-foreground">
          Your role doesn't include this. An administrator can turn it on under Roles &amp;
          Permissions → Feature access. It applies the next time you sign in.
        </p>
      </div>
    </div>
  );
}

import { getBackendSession } from "@/lib/backend/session";

/** Soul's actions on an entity. Named custom actions are allowed too. */
export type BackendAction = "get" | "getAll" | "create" | "update" | "delete" | (string & {});

/**
 * Whether the signed-in role may perform `action` on `entity`, per the role
 * matrix in Soul's admin panel. `entity` is the lowercase model name
 * (`"portfolio"`, `"workitem"`). For hiding UI only; the backend enforces it.
 */
export function backendCan(entity: string, action: BackendAction): boolean {
  const session = getBackendSession();
  if (!session) return false;
  if (session.claims.isPlatformAdmin) return true;
  return session.claims.permissions?.[entity.toLowerCase()]?.[action] === true;
}

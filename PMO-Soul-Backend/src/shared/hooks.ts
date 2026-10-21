/**
 * Hook interface for entity lifecycle events.
 *
 * InternalHooks — in-app event-triggered workflows.
 *   Production: enqueues BullMQ jobs → workflow trigger listener processes async.
 *   Preview:    fires synchronously inline → workflow interpreter runs immediately.
 *   This ensures event-triggered workflow chains cascade in preview.
 */

export interface InternalHooks {
  /** Dispatch entity event to in-app workflow trigger listener. */
  onEntityEvent?(entityName: string, event: string, data: any): void;
  /** Dispatch UI action to in-app workflow trigger listener. */
  onUiAction?(actionName: string, data: any): void;
}

/** Combined hooks passed to business logic classes. */
export interface EntityLifecycleHooks {
  internal: InternalHooks;
}

/** No-op internal hooks (only used for models that genuinely have no workflow wiring). */
export const noOpInternalHooks: InternalHooks = {
  onEntityEvent: () => {},
  onUiAction: () => {},
};

/** Convenience: fully silent hooks. */
export const noOpHooks: EntityLifecycleHooks = {
  internal: noOpInternalHooks,
};

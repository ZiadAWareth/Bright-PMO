import type { PulseExecutor } from '../../../core';

/**
 * Emits an in-app notification via the injected `notify` service port — which, at
 * real wiring, publishes the message onto the app's notification queue (BullMQ on Redis).
 * The app already owns the websocket + the queue listener that delivers it to the
 * recipient. This pulse is only the emit side. Templates resolved by the wrapper.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.notify) {
    return { error: { name: 'NotifyUnavailable', message: 'No notification service is configured.' } };
  }
  const title = String(inputs.title ?? '').trim();
  if (!title) return { error: { name: 'MissingTitle', message: 'Notification requires a title.' } };

  // Link to the record this run is about unless the step names another one: clicking the
  // notification in the bell then opens it. Not after a delete — there is nothing left to open.
  const { entity, entityId } = linkFor(inputs, ctx.variables);

  const sent = await ctx.services.notify({
    to: inputs.to ? String(inputs.to) : undefined,
    title,
    message: String(inputs.message ?? ''),
    level: String(inputs.level ?? 'info'),
    entity,
    entityId,
  });

  // A recipient that matched nobody (a role no one in this organization holds, a blank
  // "record owner" on a record without one) is not an error, but it must not look like a delivery.
  const recipients = sent && typeof sent.recipients === 'number' ? sent.recipients : undefined;
  if (recipients === 0) {
    return {
      outputs: {
        queued: false,
        recipients: 0,
        note: 'Nobody matched the recipient, so no notification was sent. Check the role or person, and that they belong to the organization this run is for.',
      },
    };
  }
  return { outputs: { queued: true, ...(recipients !== undefined ? { recipients } : {}) } };
};

/** Which record the notification opens: the step's own choice, else the run's record. */
export function linkFor(
  inputs: Record<string, unknown>,
  vars: Readonly<Record<string, unknown>>,
): { entity?: string; entityId?: string } {
  const entity = String(inputs.entity ?? '').trim() || undefined;
  const given = String(inputs.entityId ?? '').trim();
  if (given) return { entity, entityId: given };
  const runEntity = typeof vars.$entity === 'string' ? vars.$entity : undefined;
  // Another table was chosen without an id: there is no way to know which of its records.
  if (entity && runEntity && entity !== runEntity) return { entity };
  if (vars.$trigger === 'onDelete') return { entity };
  const record = vars.record as { id?: unknown } | undefined;
  const id = record && record.id != null && String(record.id) !== '' ? String(record.id) : undefined;
  return { entity: entity ?? runEntity, entityId: id };
}

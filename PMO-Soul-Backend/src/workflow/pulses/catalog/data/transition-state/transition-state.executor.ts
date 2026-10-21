import type { PulseExecutor } from '../../../core';

interface Transition {
  from?: unknown;
  to?: unknown;
}

/**
 * Moves a record's state field to a target value, enforcing the configured legal
 * transitions. Emits `IllegalTransition` if the current→target move is not allowed.
 * When no transitions are configured, any move is permitted (unguarded).
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const entity = String(inputs.entity ?? '').trim();
  const id = inputs.id;
  const field = String(inputs.stateField ?? 'status');
  const to = inputs.to;
  if (!entity || id == null || id === '' || to == null) {
    return { error: { name: 'MissingTarget', message: 'Transition requires entity, id and target state.' } };
  }
  const repo = ctx.services.repo(entity);
  const current = await repo.findUnique({ id });
  if (!current) {
    return {
      error: {
        name: 'NotFound',
        message: `No ${entity} #${String(id)} is visible to this workflow. It may have been deleted, or belong to another organisation than the one you are signed in to.`,
      },
    };
  }

  // Said plainly, instead of the database's "Unknown argument" once the update is attempted.
  if (!(field in current)) {
    return {
      error: { name: 'UnknownStateField', message: `${entity} has no field "${field}". Choose the field that holds its state.` },
    };
  }
  const from = current[field];
  const transitions: Transition[] = Array.isArray(inputs.transitions) ? (inputs.transitions as Transition[]) : [];
  if (transitions.length && !transitions.some((t) => t && t.from === from && t.to === to)) {
    return {
      error: { name: 'IllegalTransition', message: `Cannot move ${entity} #${id} from "${String(from)}" to "${String(to)}".` },
    };
  }

  const record = await repo.update({ id }, { [field]: to });
  return { outputs: { record } };
};

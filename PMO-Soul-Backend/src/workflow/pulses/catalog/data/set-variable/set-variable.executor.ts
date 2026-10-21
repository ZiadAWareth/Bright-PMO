import type { PulseExecutor } from '../../../core';

/**
 * Writes `value` to the workflow variable named `name`. Templates in the value are
 * already resolved by the wrapper before this runs, so the executor just returns
 * the output under the chosen key.
 */
export const execute: PulseExecutor = async (inputs) => {
  const name = String(inputs.name ?? '').trim();
  if (!name) {
    return { error: { name: 'MissingVariableName', message: 'Set Variable requires a variable name.' } };
  }
  return { outputs: { [name]: inputs.value } };
};

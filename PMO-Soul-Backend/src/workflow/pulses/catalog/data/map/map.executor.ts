import type { PulseExecutor } from '../../../core';

/** A variable name a later step can address as {{name}}. */
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Map Fields — `fields` arrives with its {{templates}} already filled in by the wrapper (a lone
 * {{path}} keeps its type), so this only checks the names and hands the values back.
 */
export const execute: PulseExecutor = async (inputs) => {
  const fields = inputs.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || !Object.keys(fields).length) {
    return { error: { name: 'MissingFields', message: 'Map Fields needs at least one target ← value row.' } };
  }
  const bad = Object.keys(fields).filter((k) => !NAME.test(k));
  if (bad.length) {
    return { error: { name: 'InvalidFieldName', message: 'Not a variable name: ' + bad.join(', ') + '. Use letters, digits and _ (e.g. customerName).' } };
  }
  const into = String(inputs.into ?? '').trim();
  if (into && !NAME.test(into)) {
    return { error: { name: 'InvalidFieldName', message: 'Into must be a variable name, e.g. payload.' } };
  }
  return { outputs: into ? { [into]: { ...(fields as Record<string, unknown>) } } : { ...(fields as Record<string, unknown>) } };
};

import type { Pulse } from './pulse.contract';

const NAMESPACED_TYPE = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;

/**
 * Assemble and validate a Pulse definition. Keeps every pulse's shape uniform and
 * fails loudly at load time if a required piece is missing or the type is not
 * namespaced (namespacing is what guarantees no collision with legacy node types).
 */
export function definePulse(pulse: Pulse): Pulse {
  const { meta, config, io, execute } = pulse;
  if (!meta || !meta.type) throw new Error('definePulse: meta.type is required');
  if (!NAMESPACED_TYPE.test(meta.type)) {
    throw new Error(
      `definePulse: meta.type must be namespaced (e.g. "data.createRecord"), got "${meta.type}"`,
    );
  }
  if (typeof execute !== 'function') {
    throw new Error(`definePulse(${meta.type}): execute must be a function`);
  }
  if (!Array.isArray(config)) {
    throw new Error(`definePulse(${meta.type}): config must be an array`);
  }
  if (!io || !Array.isArray(io.inputs) || !Array.isArray(io.outputs)) {
    throw new Error(`definePulse(${meta.type}): io.inputs and io.outputs are required`);
  }
  return Object.freeze({ meta, config, io, execute });
}

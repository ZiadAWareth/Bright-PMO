import { resolveTemplate, type PulseExecutor } from '../../../core';

/**
 * Iteration is driven at the interpreter level (via meta.loop='forEach'): each
 * pass it sets `item`/`index` and routes to the `body` edge, then to `done` when
 * the collection is exhausted. The body's last node loops back to this node.
 *
 * Run on its own (Test step) it only previews: the items it would go through and
 * what the first pass hands the body — so the Output pane shows real data.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const raw = inputs.collection;
  const resolved = Array.isArray(raw) ? raw : typeof raw === 'string' ? resolveTemplate(raw, ctx.variables) : undefined;
  const items = Array.isArray(resolved) ? resolved : [];
  const itemVar = String(inputs.item ?? 'item');
  const indexVar = String(inputs.index ?? 'index');
  return {
    outputs: {
      passes: items.length,
      items,
      firstPass: items.length ? { [itemVar]: items[0], [indexVar]: 0 } : null,
    },
  };
};

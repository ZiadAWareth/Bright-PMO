/**
 * Graph shape the Pulses engine walks. Deliberately defined HERE (not imported
 * from the legacy interpreter) so the new engine is fully parallel and owns its
 * own contract — the make-before-break rule. A migrated workflow stores the same
 * `{ nodes, edges }` JSON; only the node `type`s become namespaced pulse types.
 */

export interface PulseNode {
  id: string;
  /** Legacy taxonomy field. The Pulses engine dispatches purely on `type`; `kind`
   *  is used only to locate the trigger/start node. */
  kind?: string;
  /** Namespaced pulse type, e.g. `data.createRecord`. */
  type: string;
  /** Designer-set values (the pulse's config) plus an optional reserved
   *  `_runtime` object for the wrapper's cross-cutting settings. */
  config?: Record<string, unknown>;
  label?: string;
  /** Designer-only canvas coordinates; ignored by the interpreter. */
  position?: { x: number; y: number };
}

export interface PulseEdge {
  id?: string;
  from: string;
  to: string;
  /** Branch label this edge represents (e.g. `true` / `false` / a gateway case).
   *  Absent = default/unconditional edge. */
  condition?: string;
}

export interface PulseWorkflowDefinition {
  nodes: PulseNode[];
  edges: PulseEdge[];
}

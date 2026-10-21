import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { nodeTypes, TILE } from './CustomNodes';
import { useWorkflowCatalog } from './useWorkflowCatalog';
import { withDefaults } from './branches';
import { validateWorkflow } from './validateWorkflow';

/** The label an edge shows for the handle it left from: Yes/No for the legacy pair, else the branch name. */
export function edgeLabelFor(sourceHandle?: string | null): string {
  if (!sourceHandle) return '';
  return sourceHandle === 'true' ? 'Yes' : sourceHandle === 'false' ? 'No' : sourceHandle;
}

// Each step's layout box: the tile plus room for the name underneath it (two lines + one muted line).
const NODE_W = 150;
const NODE_H = TILE + 56;

/** Left-to-right dagre auto-layout (n8n-style). Returns nodes with computed positions. */
export function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    // The node's own box is the tile: centre it horizontally in the layout box, at its top.
    return { ...n, position: { x: p.x - TILE / 2, y: p.y - NODE_H / 2 } };
  });
}

/**
 * True for a flow saved by the earlier top-to-bottom canvas: its connections run mostly downward.
 * Opened in today's left-to-right canvas those would loop around every tile, so the modeler lays
 * such a flow out again on screen (saved only if the person saves).
 */
export function isTopToBottomLayout(nodes: Node[], edges: Edge[]): boolean {
  const at = new Map(nodes.map((n) => [n.id, n.position]));
  let down = 0;
  let across = 0;
  for (const e of edges) {
    const a = at.get(e.source);
    const b = at.get(e.target);
    if (!a || !b) continue;
    down += Math.abs(b.y - a.y);
    across += Math.abs(b.x - a.x);
  }
  return edges.length > 0 && down > across * 1.2;
}

/**
 * One connection between two steps. Click it to select it: a delete button appears on it (Delete
 * or Backspace also work). During a test run it shows the path: the connection being followed
 * flows in the accent colour, the ones followed stay highlighted, and branches not taken fade.
 */
type RunPath = 'flowing' | 'taken' | 'untaken' | undefined;

function PulseEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, selected, data, markerEnd }: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const runPath = (data as { runPath?: RunPath } | undefined)?.runPath;
  const isError = label === 'error';
  const stroke =
    runPath === 'flowing' || runPath === 'taken'
      ? 'hsl(var(--primary))'
      : isError
        ? '#e11d48'
        : selected
          ? 'hsl(var(--primary))'
          : '#94a3b8';
  const text = typeof label === 'string' ? label : '';
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          stroke,
          strokeWidth: runPath === 'taken' || runPath === 'flowing' || selected ? 2.5 : 1.5,
          opacity: runPath === 'untaken' ? 0.3 : 1,
          strokeDasharray: runPath === 'untaken' ? '4 4' : undefined,
          transition: 'stroke 0.2s, opacity 0.2s, stroke-width 0.2s',
        }}
      />
      {text || selected ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
            style={{ transform: 'translate(-50%, -50%) translate(' + labelX + 'px,' + labelY + 'px)', opacity: runPath === 'untaken' ? 0.45 : 1 }}
          >
            {text ? (
              <span
                className={
                  'rounded-full border bg-card px-2 py-0.5 text-[10.5px] font-semibold ' +
                  (runPath === 'taken' || runPath === 'flowing' ? 'border-primary text-primary' : isError ? 'border-rose-300 text-rose-600' : 'border-border text-muted-foreground')
                }
              >
                {text}
              </span>
            ) : null}
            {selected ? (
              <button
                type="button"
                title="Delete this connection"
                aria-label="Delete this connection"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteElements({ edges: [{ id }] });
                }}
                className="grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:bg-destructive hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { pulse: PulseEdge };

const MINIMAP_COLORS: Record<string, string> = {
  trigger: '#d97706',
  condition: '#64748b',
  action: '#059669',
  wait: '#e11d48',
};

let idSeq = 0;
const nextId = (kind: string) => kind + '_' + Date.now().toString(36) + '_' + ++idSeq;

export interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeSelect: (node: Node | null) => void;
  /** Viewing an old version: nothing can be moved, connected, deleted or added. */
  readOnly?: boolean;
  /** Changes when a different set of steps is swapped in (a version preview), so the view refits. */
  fitKey?: string | number | null;
  /** The centred "+" (n8n-style) while the flow has no trigger: opens the panel on triggers only. */
  onAddTrigger?: () => void;
}

function Flow({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  readOnly = false,
  fitKey,
  onAddTrigger,
}: WorkflowCanvasProps) {
  // A flow is its trigger first: nothing can be added before one is in place.
  const hasTrigger = nodes.some((n) => n.type === 'trigger');
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Every connection is drawn by PulseEdge, whatever created it (a saved flow, a drag, the AI, "+").
  // React Flow's own dashed animation runs only while a test run is flowing along it.
  const shownEdges = useMemo(
    () => edges.map((e) => ({ ...e, type: 'pulse', animated: (e.data as { runPath?: RunPath } | undefined)?.runPath === 'flowing' })),
    [edges],
  );
  const { screenToFlowPosition, fitView } = useReactFlow();
  // A different set of steps was swapped in: frame all of it, once the new nodes have rendered.
  useEffect(() => {
    if (fitKey === undefined) return;
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 60);
    return () => clearTimeout(t);
  }, [fitKey, fitView]);
  const { data: catalog } = useWorkflowCatalog();

  // Paths that run at the same time may meet only at a Parallel Join (validateWorkflow). Checked as
  // the line is drawn, not first at Save: the line that would make a step run twice is refused here.
  const mergeProblems = useCallback(
    (list: Array<{ source: string; target: string; sourceHandle?: string | null }>): string[] => {
      const def = {
        nodes: nodes.map((n) => {
          const d = (n.data || {}) as Record<string, any>;
          return { id: n.id, kind: n.type as any, type: d.triggerType || d.actionType || d.waitType || d.conditionType || '', label: d.label, config: d.config || {} };
        }),
        edges: list.map((e) => ({ from: e.source, to: e.target, ...(e.sourceHandle ? { condition: e.sourceHandle } : {}) })),
      };
      return validateWorkflow(def as any, catalog ? { pulses: catalog.pulses ?? [] } : undefined).filter((p) =>
        /reached by paths that run at the same time/.test(p),
      );
    },
    [nodes, catalog],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const before = new Set(mergeProblems(edges));
      const added = mergeProblems([...edges, { source: params.source, target: params.target, sourceHandle: params.sourceHandle }]).filter(
        (p) => !before.has(p),
      );
      if (added.length) {
        toast.error(added[0]);
        return;
      }
      // The edge carries its branch name as the label; the engine routes on this exact text.
      const label = edgeLabelFor(params.sourceHandle);
      const stroke = params.sourceHandle === 'error' ? '#e11d48' : '#94a3b8';
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, label, style: { stroke, strokeWidth: 1.5 } },
          eds,
        ),
      );
    },
    [setEdges, edges, mergeProblems],
  );

  /** A new step for a pulse from the components panel, with every default its catalogue declares. */
  const makeNode = useCallback(
    (item: { kind: string; subType: string; label: string }, position: { x: number; y: number }): Node => {
      // Seed every descriptor default the catalogue declares (H6). A default was display-only:
      // the modal showed "1 minute" while the engine received no amount and waited 0 ms.
      const entry = (catalog?.pulses ?? []).find((p) => p.type === item.subType);
      const config: Record<string, unknown> = withDefaults(entry, {});
      const data: Record<string, unknown> = { label: item.label, config };
      if (item.kind === 'trigger') data.triggerType = item.subType;
      else if (item.kind === 'action') data.actionType = item.subType;
      else if (item.kind === 'wait') data.waitType = item.subType;
      else if (item.kind === 'condition') data.conditionType = item.subType;
      return { id: nextId(item.kind), type: item.kind, position, data };
    },
    [catalog],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/reactflow');
      if (!raw) return;
      let item: { kind: string; subType: string; label: string };
      try {
        item = JSON.parse(raw);
      } catch {
        return;
      }
      if (!hasTrigger && item.kind !== 'trigger') {
        toast.warning('Add a trigger first: it decides when this workflow runs. Steps come after it.');
        return;
      }
      if (hasTrigger && item.kind === 'trigger') {
        toast.warning('A workflow has exactly one trigger. Delete the current one to use another.');
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setNodes((nds) => nds.concat(makeNode(item, position)));
    },
    [screenToFlowPosition, setNodes, makeNode, hasTrigger],
  );

  // A trigger picked in the panel (from the centred "+"): placed where the "+" was — or, when steps
  // are already there (the trigger was deleted), to the left of them, connected to the step that
  // starts them if there is exactly one. Its settings open straight away, as in n8n.
  useEffect(() => {
    const onAddTrigger = (ev: Event) => {
      if (readOnly) return;
      const item = (ev as CustomEvent).detail?.item;
      if (!item || item.kind !== 'trigger' || nodes.some((n) => n.type === 'trigger')) return;
      let position: { x: number; y: number };
      const roots = nodes.filter((n) => !edges.some((e) => e.target === n.id));
      if (nodes.length === 0) {
        const r = wrapperRef.current?.getBoundingClientRect();
        const c = screenToFlowPosition({ x: r ? r.left + r.width / 2 : 0, y: r ? r.top + r.height / 2 : 0 });
        position = { x: c.x - TILE / 2, y: c.y - TILE / 2 };
      } else {
        const anchor = roots[0] ?? nodes[0];
        const minX = Math.min(...nodes.map((n) => n.position.x));
        position = { x: minX - TILE - 110, y: anchor.position.y };
      }
      const node = makeNode(item, position);
      setNodes((nds) => nds.concat(node));
      if (roots.length === 1) {
        setEdges((eds) =>
          addEdge({ source: node.id, target: roots[0].id, sourceHandle: null, targetHandle: null, animated: true, label: '', style: { stroke: '#94a3b8', strokeWidth: 1.5 } }, eds),
        );
      }
      onNodeSelect(node);
    };
    window.addEventListener('pulse:add-trigger', onAddTrigger);
    return () => window.removeEventListener('pulse:add-trigger', onAddTrigger);
  }, [nodes, edges, makeNode, setNodes, setEdges, readOnly, screenToFlowPosition, onNodeSelect]);

  // "+" on a step (CustomNodes) → the components panel → this: place the chosen pulse to the
  // right of that step, below any steps it already leads to, and connect it.
  useEffect(() => {
    const onAddAfter = (ev: Event) => {
      if (readOnly) return;
      const { sourceId, item } = (ev as CustomEvent).detail || {};
      if (!sourceId || !item) return;
      const source = nodes.find((n) => n.id === sourceId);
      if (!source || !nodes.some((n) => n.type === 'trigger')) return;
      const already = edges.filter((e) => e.source === sourceId).length;
      const position = { x: source.position.x + TILE + 110, y: source.position.y + already * (TILE + 70) };
      const node = makeNode(item, position);
      setNodes((nds) => nds.concat(node));
      setEdges((eds) =>
        addEdge({ source: sourceId, target: node.id, sourceHandle: null, targetHandle: null, animated: true, label: '', style: { stroke: '#94a3b8', strokeWidth: 1.5 } }, eds),
      );
    };
    window.addEventListener('pulse:add-after', onAddAfter);
    return () => window.removeEventListener('pulse:add-after', onAddAfter);
  }, [nodes, edges, makeNode, setNodes, setEdges, readOnly]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => onNodeSelect(node),
    [onNodeSelect],
  );

  return (
    <div ref={wrapperRef} className="relative h-full flex-1 bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={shownEdges}
        edgeTypes={edgeTypes}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesFocusable={!readOnly}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={() => onNodeSelect(null)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'pulse' }}
      >
        <Background gap={16} size={1} className="!bg-transparent" color="hsl(var(--muted-foreground) / 0.18)" />
        <Controls position="bottom-left" className="!rounded-lg !border !border-border !bg-card !shadow-sm" />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!left-16 !rounded-lg !border !border-border !bg-card"
          nodeColor={(n) => MINIMAP_COLORS[n.type ?? ''] ?? '#94a3b8'}
        />
      </ReactFlow>
      {/* No trigger yet: the first thing to add, in the middle of an empty canvas (n8n-style). */}
      {!readOnly && !hasTrigger && onAddTrigger && nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <button
            type="button"
            onClick={onAddTrigger}
            aria-label="Add a trigger: choose what starts this workflow"
            className="group pointer-events-auto flex flex-col items-center gap-3 rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-dashed border-muted-foreground/40 bg-card text-muted-foreground shadow-sm transition-colors duration-150 group-hover:border-primary group-hover:bg-primary/5 group-hover:text-primary">
              <Plus className="h-9 w-9" aria-hidden />
            </span>
            <span className="text-center">
              <span className="block text-sm font-semibold text-foreground">Add a trigger</span>
              <span className="block text-[12px] text-muted-foreground">Choose what starts this workflow</span>
            </span>
          </button>
        </div>
      ) : null}
      {/* Steps but no trigger (it was deleted): nothing runs until one is added back. */}
      {!readOnly && !hasTrigger && onAddTrigger && nodes.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex justify-center px-3">
          <div
            role="status"
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-500/40 bg-card px-3 py-2 text-[12.5px] shadow-lg"
          >
            <Zap className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <span className="text-foreground">This workflow has no trigger, so it can never run.</span>
            <button
              type="button"
              onClick={onAddTrigger}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add a trigger
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

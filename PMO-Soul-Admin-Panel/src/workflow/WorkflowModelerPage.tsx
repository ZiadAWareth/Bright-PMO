import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Play, Power, Save, Loader2, LayoutGrid, Plus, Check, Download, History, RotateCcw, AlertTriangle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import NodePalette from './NodePalette';
import { downloadWorkflowFile } from './workflowFile';
import WorkflowCanvas, { layoutNodes, isTopToBottomLayout } from './WorkflowCanvas';
import PulseNodeModal from './PulseNodeModal';
import TriggerSampleField from './TriggerSampleField';
import TriggerInputPanel from './TriggerInputPanel';
import { upstreamIds } from './upstream';
import WorkflowAIPanel from './WorkflowAIPanel';
import WorkflowVersionHistory, { describeDifference } from './WorkflowVersionHistory';
import workflowService, { pulseService, formatUsage, type WorkflowDefinition, type WorkflowVersion, type TriggerInputResult } from './workflowService';
import { io } from 'socket.io-client';
import { getToken } from '@/lib/api';
import { useWorkflowCatalog, useEntityNames, useFanOut, findManifestEntry } from './useWorkflowCatalog';
import { validateWorkflow } from './validateWorkflow';
import { withDefaults, adoptSoleBranch } from './branches';
import { useCan } from '@/lib/auth';

const EDGE_STYLE = { stroke: '#94a3b8', strokeWidth: 1.5 };

/** Available target entities for this app's workflows (injected at generation). */
// G19 — entities come from the catalogue API, never a bundled literal.

/** A step's status in a run → the node's run state on the canvas. */
const WAIT_UNIT_MS: Record<string, number> = { seconds: 1_000, minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000 };

/**
 * What a Wait run by Test step shows: when it ends (a duration, or a date typed in), or, waiting
 * on a record, when it gives up. A date dragged in from another step is not known here: no clock.
 */
function waitShownFor(c: Record<string, any>): { until?: number; label?: string } {
  if (c.mode === 'condition') {
    const amount = Number(c.giveUpAfter ?? 1);
    const ms = (amount > 0 ? amount : 1) * (WAIT_UNIT_MS[String(c.giveUpUnit ?? 'days')] ?? WAIT_UNIT_MS.days);
    return { until: Date.now() + ms, label: 'Waiting for the record' };
  }
  if (c.mode === 'until') {
    const at = Date.parse(String(c.until ?? ''));
    return Number.isFinite(at) ? { until: at } : {};
  }
  return { until: Date.now() + Number(c.amount ?? 1) * (WAIT_UNIT_MS[String(c.unit ?? 'minutes')] ?? WAIT_UNIT_MS.minutes) };
}

function runStateOf(s: any): 'running' | 'success' | 'error' | 'skipped' {
  const st = String(s?.status || '').toLowerCase();
  if (st === 'failed' || s?.error) return 'error';
  if (st === 'skipped') return 'skipped';
  if (st === 'running' || st === 'waiting' || st === 'pending') return 'running';
  return 'success';
}

/**
 * Which connections a run followed: a connection is TAKEN when both its ends ran, UNTAKEN when it
 * leaves a step that ran towards one that never did (the branch an Evaluate / gateway did not
 * choose). Connections between steps that never ran are left as they are.
 */
function pathOf(edges: Edge[], ran: Set<string>): Edge[] {
  return edges.map((e) => {
    const runPath = ran.has(e.source) && ran.has(e.target) ? 'taken' : ran.has(e.source) ? 'untaken' : undefined;
    return { ...e, data: { ...(e.data || {}), runPath } };
  });
}

const clearPath = (edges: Edge[]): Edge[] => edges.map((e) => ({ ...e, data: { ...(e.data || {}), runPath: undefined } }));

/** Stored graph -> React Flow nodes + edges. */
function definitionToFlow(definition?: WorkflowDefinition | null): { nodes: Node[]; edges: Edge[] } {
  if (!definition) return { nodes: [], edges: [] };
  const nodes: Node[] = (definition.nodes || []).map((n) => ({
    id: n.id,
    type: n.kind,
    position: n.position || { x: 0, y: 0 },
    data: {
      label: n.label || n.type || n.kind,
      ...(n.kind === 'trigger' && { triggerType: n.type }),
      ...(n.kind === 'action' && { actionType: n.type }),
      ...(n.kind === 'wait' && { waitType: n.type }),
      // A condition is a pulse too (control.exclusiveGateway); dropping its type here used to
      // save it back as "" and the engine then had no pulse to run.
      ...(n.kind === 'condition' && { conditionType: n.type || 'control.exclusiveGateway' }),
      ...(n.kind === 'condition' && {
        field: (n.config as any)?.field,
        operator: (n.config as any)?.operator,
        value: (n.config as any)?.value,
      }),
      config: n.config || {},
    },
  }));

  // Legacy drawings: an unlabelled edge out of a node whose only outstanding outcome is, say,
  // 'completed' becomes that outcome, so the save check does not refuse what the engine runs.
  const storedEdges = adoptSoleBranch(definition.nodes || [], definition.edges || []);
  const edges: Edge[] = storedEdges.map((e, i) => ({
    id: e.id || 'edge_' + i,
    source: e.from,
    target: e.to,
    sourceHandle: e.condition || undefined,
    // A named branch is its own label; the engine routes on this exact text (same rule as
    // WorkflowCanvas.edgeLabelFor, inlined here).
    label: e.condition === 'true' ? 'Yes' : e.condition === 'false' ? 'No' : e.condition || '',
    animated: true,
    style: e.condition === 'error' ? { stroke: '#e11d48', strokeWidth: 1.5 } : EDGE_STYLE,
  }));

  return { nodes, edges };
}

/** React Flow nodes + edges -> stored graph. */
function flowToDefinition(nodes: Node[], edges: Edge[]): WorkflowDefinition {
  const defNodes = nodes.map((n) => {
    const d = n.data as Record<string, any>;
    const kind = (n.type || 'action') as 'trigger' | 'condition' | 'action' | 'wait';
    const subType =
      d.triggerType || d.actionType || d.waitType || d.conditionType || (kind === 'condition' ? 'control.exclusiveGateway' : '');
    const config = { ...(d.config || {}) };
    if (kind === 'condition') {
      if (d.field) config.field = d.field;
      if (d.operator) config.operator = d.operator;
      if (d.value !== undefined) config.value = d.value;
    }
    return { id: n.id, kind, type: subType, config, position: n.position, label: d.label };
  });

  const defEdges = edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    ...(e.sourceHandle && { condition: e.sourceHandle }),
  }));

  return { nodes: defNodes, edges: defEdges };
}

/** What Save stores, as one comparable string: name, target table, steps, settings, connections. */
function savedFingerprint(name: string, entity: string, nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({ name: name.trim(), entity: entity.trim(), definition: flowToDefinition(nodes, edges) });
}

export default function WorkflowModelerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  // Wave D — opened from Runs & Incidents with ?runId=: that run's step states are painted on the canvas.
  const [searchParams] = useSearchParams();
  const inspectRunId = searchParams.get('runId');
  const [inspectedRun, setInspectedRun] = useState<{ id: string; status: string } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  // Read by the run replay, which runs outside React's render cycle.
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const edgesRef = useRef<Edge[]>([]);
  edgesRef.current = edges;
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [workflowName, setWorkflowName] = useState('');
  const [workflowEntity, setWorkflowEntity] = useState('');
  // Read by a test of a never-saved canvas, which the server cannot look up by id.
  const workflowEntityRef = useRef('');
  workflowEntityRef.current = workflowEntity;
  const [workflowStatus, setWorkflowStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  // A toast is easy to miss; the button itself says "Saved" for a moment after a successful save.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Set by a step's "+": the components panel then adds the chosen pulse after that step, connected.
  const [addAfter, setAddAfter] = useState<{ sourceId: string; sourceLabel: string } | null>(null);
  useEffect(() => {
    const onQuickAdd = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail?.sourceId) return;
      // Nothing is added before a trigger: with none on the canvas, a step's "+" asks for one first.
      if (!nodesRef.current.some((n) => n.type === 'trigger')) {
        setAddAfter(null);
        setPaletteOpen(true);
        toast.message('Add a trigger first: the steps run after it.');
        return;
      }
      setAddAfter(detail);
      setPaletteOpen(true);
    };
    window.addEventListener('pulse:quick-add', onQuickAdd);
    return () => window.removeEventListener('pulse:quick-add', onQuickAdd);
  }, []);

  const [testOpen, setTestOpen] = useState(false);
  const [testContext, setTestContext] = useState('{}');
  // Which input the Test dialog's trigger panel chose (webhook / schedule / sign-up).
  const [testFrom, setTestFrom] = useState<'lastRun' | 'sample' | null>(null);
  // Wave D — answers the tester types for each human.userTask node, keyed by node id then form key.
  // Sent as taskAnswers so the test run can walk the approve path instead of parking on the task.
  const [taskAnswers, setTaskAnswers] = useState<Record<string, Record<string, unknown>>>({});
  // Per-node test output shown in the modal's OUTPUT pane (e.g. a trigger's sample record).
  const [nodeTesting, setNodeTesting] = useState(false);
  const [running, setRunning] = useState(false);
  // A Wait being run by Test step: what its countdown shows in the step window.
  const [nodeWait, setNodeWait] = useState<{ until?: number; label?: string } | null>(null);
  // The background test in progress: Skip wait and Stop reach it; leaving the editor stops it, so
  // nothing after a long Wait runs unseen.
  const activeTestRef = useRef<string | null>(null);
  const stopTest = useCallback(() => {
    const id = activeTestRef.current;
    if (id) workflowService.cancelTest(id).catch(() => {});
  }, []);
  useEffect(() => {
    const skip = () => {
      const id = activeTestRef.current;
      if (id) workflowService.skipTestWait(id).catch(() => {});
    };
    window.addEventListener('pulse:skip-wait', skip);
    return () => {
      window.removeEventListener('pulse:skip-wait', skip);
      const id = activeTestRef.current;
      if (id) workflowService.cancelTest(id).catch(() => {});
    };
  }, []);
  // Per-node test results, persisted across node switches so a downstream node's
  // INPUT panel can read any upstream node's output (n8n-style). `source` flags
  // whether a trigger's data is real DB data, a generated sample, a run result, the last real run's
  // input (at = when), or the sample typed in the trigger's Input pane.
  const [nodeOutputs, setNodeOutputs] = useState<
    Record<
      string,
      {
        output: unknown;
        source: 'real' | 'generated' | 'run' | 'lastRun' | 'sample' | null;
        // A For Each / While records once per pass and once when done: all of them, oldest first.
        runs?: unknown[];
        at?: string;
        // Test step of a Run JavaScript step: its console.log lines, and why it failed.
        console?: Array<{ level: string; text: string }>;
        error?: string | null;
      }
    >
  >({});

  const workflowIdRef = useRef<string | undefined>(id);
  // The last saved state, to tell whether Save has anything to do. null = never saved (a new workflow).
  const [savedKey, setSavedKey] = useState<string | null>(null);
  // Set right before a navigation that must not be held back (after Discard, after a save).
  const leaveOkRef = useRef(false);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    workflowService
      .getOne(id as string)
      .then((wf) => {
        setWorkflowName(wf.name || '');
        setWorkflowEntity(wf.entityName || '');
        setWorkflowStatus(wf.status || 'DRAFT');
        setCurrentVersion(typeof wf.version === 'number' ? wf.version : null);
        workflowIdRef.current = String(wf.id);
        const flow = definitionToFlow(wf.definition);
        // Saved by the earlier top-to-bottom canvas? Lay it out left to right on screen; the new
        // positions are kept only if the person saves.
        const shown = isTopToBottomLayout(flow.nodes, flow.edges) ? layoutNodes(flow.nodes, flow.edges) : flow.nodes;
        setNodes(shown);
        setEdges(flow.edges);
        setSavedKey(savedFingerprint(wf.name || '', wf.entityName || '', shown, flow.edges));
        // The last Test run, kept with the workflow: each step's Input and Output panes show it again.
        const last = (wf as any).lastTest as { at?: string; input?: unknown; steps?: any[] } | null | undefined;
        if (last && Array.isArray(last.steps)) {
          const loopIds = new Set(
            shown
              .filter((n) => {
                const d = (n.data || {}) as Record<string, unknown>;
                const t = String(d.pulseType || d.actionType || d.conditionType || '');
                return t === 'control.forEach' || t === 'control.whileLoop';
              })
              .map((n) => n.id),
          );
          const kept: Record<string, { output: unknown; source: 'run'; runs?: unknown[] }> = {};
          for (const s of last.steps) {
            if (!s?.nodeId) continue;
            const prev = kept[s.nodeId];
            kept[s.nodeId] = {
              output: s.output,
              source: 'run',
              ...(loopIds.has(s.nodeId) ? { runs: [...(prev?.runs ?? []), s.output] } : {}),
            };
          }
          const trig = shown.find((n) => n.type === 'trigger');
          if (trig && last.input && typeof last.input === 'object') kept[trig.id] = { output: last.input, source: 'run' };
          setNodeOutputs(kept);
        }
      })
      .catch((err) => toast.error('Failed to load: ' + (err instanceof Error ? err.message : 'error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const ENTITIES = useEntityNames();
  // PG-07 — the buttons render from the SAME permission list the API enforces,
  // so an affordance can never be offered for something that will be refused.
  const canActivate = useCan('Workflow', 'action:activate');
  const canDeactivate = useCan('Workflow', 'action:deactivate');
  const canTest = useCan('Workflow', 'action:test');
  // PG-05 — how many other workflows already run on this entity, on the SAME trigger: one on
  // "created" never runs alongside one on "updated", so only same-trigger workflows are counted.
  const currentTrigger = useMemo(() => {
    for (const n of nodes) {
      const d = (n.data || {}) as Record<string, any>;
      const t = d.triggerType || (typeof d.pulseType === 'string' && d.pulseType.startsWith('trigger.') ? d.pulseType : '');
      if (t) return String(t);
    }
    return undefined;
  }, [nodes]);
  const { data: fanOut } = useFanOut(workflowEntity || undefined, workflowIdRef.current ?? undefined, currentTrigger);
  const { data: catalog } = useWorkflowCatalog();

  // Fill each node's config with its pulse's declared defaults, underneath whatever is set.
  // Applied to AI output and again at save, so a default the author never touched reaches the
  // engine as a real value instead of being shown in the modal and dropped on save (H6).
  const seedDefaults = useCallback(
    (list: Node[]): Node[] =>
      list.map((n) => {
        const d = (n.data || {}) as Record<string, any>;
        const type = d.pulseType || d.triggerType || d.actionType || d.waitType || d.conditionType;
        const entry = (catalog?.pulses ?? []).find((p) => p.type === type);
        if (!entry) return n;
        return { ...n, data: { ...d, config: withDefaults(entry, d.config) } };
      }),
    [catalog],
  );

  // The modal is driven by the catalogue, not by the node: a node only stores
  // its pulse type, and the field descriptors live in the catalogue entry.
  const selectedPulse = useMemo(() => {
    const d = (selectedNode?.data || {}) as Record<string, any>;
    const type = d.pulseType || d.triggerType || d.actionType || d.conditionType;
    return findManifestEntry(catalog?.pulses, type);
  }, [catalog, selectedNode]);

  // Upstream steps offered to the open node's INPUT panel: every OTHER node that has
  // a captured output, so the user can map fields from any prior step (n8n-style).
  // Only the steps BEFORE the open one (upstream.ts): a later step has not run when this one does,
  // so its data can never be read here.
  const upstream = useMemo(
    () => (selectedNode ? upstreamIds(selectedNode.id, nodes, edges) : []),
    [selectedNode, nodes, edges],
  );
  const modalSteps = useMemo(
    () =>
      upstream
        .filter((nid) => nodeOutputs[nid]?.output !== undefined)
        .map((nid) => ({
          nodeId: nid,
          label: String(((nodes.find((n) => n.id === nid)?.data as any) || {}).label || nid),
          output: nodeOutputs[nid].output,
        })),
    [upstream, nodeOutputs, nodes],
  );

  // The immediately-previous node, used as the INPUT panel's default selection.
  const directPrevId = useMemo(
    () => (selectedNode ? edges.find((e) => e.target === selectedNode.id)?.source : undefined),
    [edges, selectedNode],
  );

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!workflowName.trim()) {
      toast.warning('Please enter a workflow name');
      return false;
    }
    if (!workflowEntity.trim()) {
      toast.warning('Please choose a target entity (e.g. Order)');
      return false;
    }

    try {
      setSaving(true);
      const seeded = seedDefaults(nodes);
      const definition = flowToDefinition(seeded, edges);

      // G20 — an invalid graph must never reach the database. It used to save cleanly and fail at
      // run time, far from the edit that broke it.
      // The catalogue goes in whole: the validator reads each pulse's branches (every declared
      // outcome must be wired), loop heads (the only place a cycle is allowed), required config,
      // entity names and the default "store result as" values, so a new pulse is covered the day
      // it ships without this page changing.
      const problems = validateWorkflow(
        definition as any,
        catalog ? { pulses: catalog.pulses ?? [], entities: catalog.entities ?? [] } : undefined,
      );
      // Save says what is unfinished and keeps nothing until it is fixed. Testing does not wait for
      // it: Test and "Execute previous steps" run the canvas as it is, saved or not, so a required
      // field can be filled from real data before the first save.
      if (problems.length > 0) {
        problems.slice(0, 4).forEach((p) => toast.error(p));
        if (problems.length > 4) toast.error(`…and ${problems.length - 4} more problem(s).`);
        return false;
      }

      const payload = {
        name: workflowName.trim(),
        entityId: workflowEntity.trim(),
        entityName: workflowEntity.trim(),
        definition,
      };
      if (isNew && !workflowIdRef.current) {
        const created = await workflowService.create(payload);
        workflowIdRef.current = String(created.id);
        // Our own move to the new workflow's address is not "leaving with unsaved changes".
        leaveOkRef.current = true;
        navigate('/automation/workflows/' + created.id, { replace: true });
        toast.success('Workflow created');
      } else {
        const saved = await workflowService.update(workflowIdRef.current as string, payload);
        if (typeof (saved as any)?.version === 'number') setCurrentVersion((saved as any).version);
        toast.success('Workflow saved');
      }
      setSavedKey(savedFingerprint(workflowName, workflowEntity, nodes, edges));
      setJustSaved(true);
      return true;
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : 'error'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowName, workflowEntity, isNew, navigate, catalog, seedDefaults]);

  const handleToggleActive = useCallback(async () => {
    const wfId = workflowIdRef.current;
    if (!wfId) return;
    try {
      if (workflowStatus === 'ACTIVE') {
        await workflowService.deactivate(wfId);
        setWorkflowStatus('INACTIVE');
        toast.success('Workflow deactivated');
      } else {
        await workflowService.activate(wfId);
        setWorkflowStatus('ACTIVE');
        toast.success('Workflow activated');
      }
    } catch (err) {
      // A draft saved with problems is refused here: show the server's reasons, one per line,
      // not "Request failed with status code 400".
      const data = (err as { response?: { data?: { problems?: string[]; message?: string | string[] } } }).response?.data;
      const reasons = Array.isArray(data?.problems) && data.problems.length ? data.problems : null;
      if (reasons) {
        toast.error('This workflow cannot go live yet', { description: reasons.slice(0, 4).join('\n'), duration: 10000 });
        if (reasons.length > 4) toast.error('…and ' + (reasons.length - 4) + ' more problem(s).');
      } else {
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
        toast.error('Toggle failed: ' + (message || (err instanceof Error ? err.message : 'error')));
      }
    }
  }, [workflowStatus]);

  // Merge captured node outputs into a flat variable bag, like the interpreter, so a
  // step test resolves {{templates}} against upstream results.
  // Only the steps before the one being tested, in flow order — a later step's output must not
  // leak into a test of an earlier one.
  const accumulatedVars = useCallback(() => {
    const bag: Record<string, unknown> = {};
    for (const nid of upstream) {
      const v = nodeOutputs[nid];
      if (v?.output && typeof v.output === 'object' && !Array.isArray(v.output)) {
        Object.assign(bag, v.output as Record<string, unknown>);
      }
    }
    return bag;
  }, [nodeOutputs, upstream]);

  // For Each / While: the one kind of step that records more than once in a run.
  const isLoopNode = (id: string): boolean => {
    const d = ((nodesRef.current.find((n) => n.id === id)?.data as any) || {}) as Record<string, unknown>;
    const t = String(d.pulseType || d.actionType || d.conditionType || '');
    return t === 'control.forEach' || t === 'control.whileLoop';
  };

  // Paint a finished run's steps onto the canvas: step status -> node runState, and every step's
  // output captured so the node modal can show it. Shared by Test and by the ?runId= inspector.
  const paintSteps = useCallback(
    (steps: any[], scope?: Set<string>) => {
      setNodeOutputs((m) => {
        const next = { ...m };
        const loopRuns: Record<string, unknown[]> = {};
        for (const s of steps) {
          if (!s?.nodeId) continue;
          next[s.nodeId] = { output: s.output, source: 'run' };
          if (isLoopNode(s.nodeId)) (loopRuns[s.nodeId] ??= []).push(s.output);
        }
        for (const [nid, runs] of Object.entries(loopRuns)) next[nid] = { ...next[nid], runs };
        return next;
      });
      const ran = new Set<string>(steps.filter((s) => s?.nodeId).map((s) => String(s.nodeId)));
      // The trigger started the run even when it records no step of its own.
      if (ran.size) for (const n of nodesRef.current) if (n.type === 'trigger') ran.add(n.id);
      setNodes((nds) =>
        nds.map((n) => {
          const last = [...steps].reverse().find((x) => x.nodeId === n.id);
          // Run up to a step: the steps after it were never part of the run — leave them be.
          if (scope && !scope.has(n.id)) return n;
          if (n.type === 'trigger' && ran.size) return { ...n, data: { ...n.data, runState: 'success' } };
          // A step the run never reached is dimmed, so the path that DID run stands out.
          return { ...n, data: { ...n.data, runState: last ? runStateOf(last) : ran.size ? 'skipped' : undefined } };
        }),
      );
      setEdges((eds) => pathOf(eds, ran));
    },
    [setNodes, setEdges],
  );

  // "Execute previous steps" (n8n): the step being edited, waiting for the record picker.
  const pendingUpTo = useRef<string | null>(null);

  useEffect(() => {
    if (!inspectRunId || loading) return;
    workflowService
      .run(inspectRunId)
      .then((run) => {
        setInspectedRun({ id: String(run.id), status: String(run.status || '') });
        paintSteps(Array.isArray(run.steps) ? run.steps : []);
      })
      .catch(() => toast.error('Could not load run ' + inspectRunId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectRunId, loading]);

  // Run the whole workflow LIVE: the backend streams each node's lifecycle over the
  // workflow websocket (`test.step` events tagged with our runId) as it actually
  // executes, so nodes light up in real time (spinner → success/error) with their
  // incoming edge animating. The HTTP response is the authoritative record — we
  // reconcile from it at the end so the final state is correct even if the socket
  // dropped an event. It runs for real (records kept, email and notifications sent); every step's
  // input & output is kept so any node can be inspected afterwards.
  const runFlowFrom = useCallback(async (upTo?: string) => {
    // Saved or not: a canvas that has never been saved is tested as it is (test-draft), so a design
    // can be run while it is still being finished.
    const wfId = workflowIdRef.current;
    // Up to a step: only the steps that lead to it (everything upstream), so the run stops right
    // before it and its Input pane fills with real data — n8n's "Execute previous nodes".
    const fullDef = flowToDefinition(nodesRef.current, edgesRef.current);
    let scope: Set<string> | undefined;
    if (upTo) {
      scope = new Set<string>();
      const back = [upTo];
      while (back.length) {
        const id = back.pop() as string;
        // Never through the step itself: inside a loop its own line leads back around to it, and
        // the run would then include it (and every pass), not stop right before it.
        for (const e of fullDef.edges) if (e.to === id && e.from !== upTo && !scope.has(e.from)) {
          scope.add(e.from);
          back.push(e.from);
        }
      }
      if (!fullDef.nodes.some((n) => scope!.has(n.id) && n.kind === 'trigger')) {
        toast.warning('Connect this step to the trigger first — nothing leads to it yet.');
        return;
      }
    }
    const definition = scope
      ? { nodes: fullDef.nodes.filter((n) => scope!.has(n.id)), edges: fullDef.edges.filter((e) => scope!.has(e.from) && scope!.has(e.to)) }
      : fullDef;
    const upToLabel = upTo ? String((nodesRef.current.find((n) => n.id === upTo)?.data as any)?.label || 'this step') : '';
    setTestOpen(false);
    setRunning(true);
    setNodes((nds) => nds.map((n) => (scope && !scope.has(n.id) && n.type !== 'trigger' ? n : { ...n, data: { ...n.data, runState: undefined, runInfo: undefined } })));
    setEdges((eds) => clearPath(eds));

    const runId =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`;
    const SOCKET_URL = import.meta.env.VITE_API_URL ?? '';
    let socket: ReturnType<typeof io> | null = null;

    const liveLoopRuns: Record<string, unknown[]> = {};
    // Steps that have finished in this run, starting with the trigger that started it.
    const done = new Set<string>(nodesRef.current.filter((n) => n.type === 'trigger').map((n) => n.id));
    setNodes((nds) => nds.map((n) => (n.type === 'trigger' ? { ...n, data: { ...n.data, runState: 'success' } } : n)));

    // Live, as the engine reports it (n8n-style): a step spins while it runs and the connection
    // the run arrived by flows; when it finishes the step ticks (or fails) and that connection
    // stays lit. Nothing is replayed or slowed down.
    const applyPhase = (nodeId: string, phase: string, output?: unknown, until?: number, label?: string) => {
      // A Parallel Join got one branch and waits for the rest: that branch's line is done, and
      // the join says how many have arrived — it has not run yet.
      if (phase === 'arrived') {
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, runInfo: { note: label } } } : n)));
        setEdges((eds) =>
          eds.map((e) => (e.target === nodeId && done.has(e.source) ? { ...e, data: { ...(e.data || {}), runPath: 'taken' } } : e)),
        );
        return;
      }
      // 'waiting': a Wait really waits in a test — its tile counts down and offers Skip, like n8n.
      const busy = phase === 'running' || phase === 'waiting';
      const rs = busy ? 'running' : phase === 'error' ? 'error' : phase === 'skipped' ? 'skipped' : 'success';
      const runInfo = phase === 'waiting' && until ? { until, skippable: true, label } : undefined;
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, runState: rs, runInfo } } : n)));
      if (phase === 'waiting') return;
      if (phase === 'running') {
        setEdges((eds) =>
          eds.map((e) => (e.target === nodeId && done.has(e.source) ? { ...e, data: { ...(e.data || {}), runPath: 'flowing' } } : e)),
        );
      } else {
        done.add(nodeId);
        setEdges((eds) =>
          eds.map((e) =>
            e.target === nodeId && done.has(e.source) ? { ...e, data: { ...(e.data || {}), runPath: 'taken' } } : e,
          ),
        );
      }
      if (phase !== 'running' && output !== undefined) {
        // A loop reports every pass: keep them all, so its Output pane can step through them.
        const runs = isLoopNode(nodeId) ? (liveLoopRuns[nodeId] = [...(liveLoopRuns[nodeId] ?? []), output]) : undefined;
        setNodeOutputs((m) => ({ ...m, [nodeId]: { output, source: 'run', runs } }));
      }
    };

    // Live progress (best-effort). If the socket can't connect, the HTTP result
    // below still drives the final canvas state.
    try {
      socket = io(`${SOCKET_URL}/workflow`, {
        transports: ['websocket'],
        reconnection: false,
        // The gateway rejects unauthenticated handshakes; without this the socket
        // is disconnected and we silently fall back to post-run reconciliation.
        auth: (cb: (data: { token: string | null }) => void) => cb({ token: getToken() }),
      });
      socket.on('workflow:update', (evt: { eventType?: string; payload?: any }) => {
        if (evt?.eventType !== 'test.step' || evt?.payload?.runId !== runId) return;
        const p = evt.payload;
        const note =
          p.phase === 'arrived'
            ? p.arrived + ' of ' + p.needed + ' branches arrived — waiting for ' + (p.needed - p.arrived) + ' more'
            : p.label;
        applyPhase(p.nodeId, p.phase, p.output, p.until, note);
      });
    } catch {
      socket = null;
    }

    // Let the socket finish its authenticated handshake (and join its user room)
    // before kicking off the run, so the earliest node events aren't missed.
    // Capped so a slow or failed socket never delays the test.
    if (socket) {
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        socket!.on('connect', done);
        socket!.on('connect_error', done);
        setTimeout(done, 1200);
      });
    }

    try {
      const ctx = JSON.parse(testContext);
      // Started in the background, so a Wait can take as long as it takes: steps arrive live over
      // the socket, the result as test.done — and by polling, should the socket miss it.
      activeTestRef.current = runId;
      // What is on the canvas is what runs — saved or not, as in n8n — so an edit is tested the
      // moment it is made. Saving stays its own, deliberate step.
      const testedUnsaved = dirtyRef.current;
      await workflowService.startTest(wfId || null, ctx, runId, taskAnswers, definition, workflowEntityRef.current || undefined);
      const result: any = await new Promise((resolve) => {
        let settled = false;
        const finish = (r: unknown) => {
          if (settled) return;
          settled = true;
          clearInterval(poll);
          resolve(r);
        };
        socket?.on('workflow:update', (evt: { eventType?: string; payload?: any }) => {
          if (evt?.eventType === 'test.done' && evt?.payload?.runId === runId) finish(evt.payload.result);
        });
        const poll = setInterval(() => {
          workflowService
            .testResult(runId)
            .then((r: any) => {
              if (r?.status === 'done') finish(r.result);
            })
            .catch(() => finish({ status: 'failed', error: 'The test run was lost (the server restarted).', steps: [] }));
        }, 4000);
      });
      const steps: any[] = Array.isArray(result?.steps) ? result.steps : [];
      // Authoritative end state: the path taken stays lit, untaken branches fade, unreached steps dim.
      paintSteps(steps, scope);
      // The trigger records no step of its own; what the run started with is its output, so every
      // later step can map from it (record, payload, signUp…).
      const trig = nodesRef.current.find((n) => n.type === 'trigger');
      if (trig && result?.input && typeof result.input === 'object') {
        setNodeOutputs((m) => ({ ...m, [trig.id]: { output: result.input, source: 'run' } }));
      }
      const usageLine = formatUsage(result?.usage);
      const failed = String(result?.status).toLowerCase() === 'failed' || !!result?.error;
      // Said plainly when the run used edits that are not saved yet: the test was of THEM.
      const note = [testedUnsaved ? 'Tested your unsaved changes — save to keep them.' : null, usageLine].filter(Boolean).join(' · ') || undefined;
      if (failed) {
        toast.error('Test run failed' + (result?.error ? ': ' + result.error : ''), {
          description: note,
        });
      } else if (upTo) {
        toast.success('Ran the ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') + ' before “' + upToLabel + '” — its Input now has their data.', { description: note });
      } else {
        toast.success(
          `Test run completed — ${steps.length} step${steps.length === 1 ? '' : 's'}. Open any node to inspect its input & output.`,
          { description: note },
        );
      }
    } catch (err) {
      toast.error('Test run failed: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      activeTestRef.current = null;
      setRunning(false);
      try {
        socket?.off('workflow:update');
        socket?.disconnect();
      } catch {
        /* ignore */
      }
    }
  }, [testContext, taskAnswers, paintSteps, setNodes, setEdges]);

  // The Test dialog's Run Test: the whole flow — or, when "Execute previous steps" opened it to pick
  // the record first, the steps before that one.
  const runFlow = useCallback(() => {
    const upTo = pendingUpTo.current;
    pendingUpTo.current = null;
    return runFlowFrom(upTo ?? undefined);
  }, [runFlowFrom]);


  // A trigger's input, as the server's one builder shaped it (pulses/core/trigger-input), becomes
  // the trigger's output here, so the next steps can be designed against it.
  const applyTriggerInput = useCallback((nid: string, res: TriggerInputResult | null | undefined) => {
    if (!res?.variables) return false;
    const source = res.from === 'lastRun' ? 'lastRun' : res.from === 'record' ? 'real' : 'sample';
    setNodeOutputs((m) => ({ ...m, [nid]: { output: res.variables, source, at: res.lastRun?.at } }));
    return true;
  }, []);

  // Simulate a trigger: what a run of it would start with. Best first: this workflow's last real
  // run of the trigger, then the sample typed in its Input pane — and, for a RECORD trigger only,
  // the table's newest row (a schema-generated sample when the table is empty). A webhook, a
  // schedule or a sign-up never gets a row: a real run of them has none.
  const handleSimulateTrigger = useCallback(async () => {
    if (!selectedNode) return;
    const d = (selectedNode.data || {}) as Record<string, any>;
    const kind = d.triggerType || d.pulseType;
    const spec = selectedPulse?.meta.triggerInput;
    const isRecord = !spec || spec.source === 'record';
    if (isRecord && !workflowEntity.trim()) {
      toast.warning('Choose a target entity in the header first.');
      return;
    }
    const nid = selectedNode.id;
    setNodeTesting(true);
    try {
      const res = await pulseService.triggerInput({
        workflowId: workflowIdRef.current,
        trigger: { type: kind, config: d.config ?? {} },
        entity: workflowEntity || undefined,
        prefer: 'auto',
        given: isRecord ? undefined : (d.config?._sample ?? undefined),
      });
      if (applyTriggerInput(nid, res)) {
        toast.success(
          res.from === 'lastRun'
            ? 'Loaded the input of the last real run'
            : res.from === 'record'
              ? 'Loaded a real ' + workflowEntity + ' record from the database'
              : 'Simulated with your sample',
        );
      } else if (isRecord) {
        const sample = await pulseService.sampleSkeleton(workflowEntity);
        const output =
          kind === 'trigger.recordUpdated'
            ? { ...sample, record: sample, previous: sample, changedFields: [] as string[] }
            : { ...sample, record: sample };
        setNodeOutputs((m) => ({ ...m, [nid]: { output, source: 'generated' } }));
        toast.warning('No ' + workflowEntity + ' records yet — showing a schema-generated sample (not real data)');
      }
    } catch {
      toast.error('Could not load what this trigger starts with');
    } finally {
      setNodeTesting(false);
    }
  }, [workflowEntity, selectedNode, selectedPulse, applyTriggerInput]);

  // Test a single step: triggers load their sample; every other node runs against the
  // accumulated upstream outputs, so its result is ready for the next node's INPUT.
  const handleTestNode = useCallback(async () => {
    if (!selectedNode || !selectedPulse) return;
    if (selectedPulse.meta.category === 'trigger') {
      handleSimulateTrigger();
      return;
    }
    const nid = selectedNode.id;
    setNodeTesting(true);
    // A Wait tested on its own waits as long as live; the step shows how long, with Skip.
    const isWait = selectedPulse.meta.type === 'time.wait';
    const testId = isWait ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'wait-' + Date.now()) : undefined;
    try {
      const cfg = (((selectedNode.data as any) || {}).config ?? {}) as Record<string, unknown>;
      if (testId) {
        activeTestRef.current = testId;
        setNodeWait(waitShownFor(cfg));
      }
      const res: any = await pulseService.testNode(selectedPulse.meta.type, cfg, accumulatedVars(), testId);
      // console.log lines come back through the run's log, marked "[console] " (run-code.executor).
      const consoleLines = (Array.isArray(res?.logs) ? res.logs : [])
        .filter((l: any) => typeof l?.message === 'string' && l.message.startsWith('[console] '))
        .map((l: any) => ({ level: l.level === 'error' ? 'error' : l.level === 'warn' ? 'warn' : 'log', text: l.message.slice(10) }));
      setNodeOutputs((m) => ({
        ...m,
        [nid]: { output: res?.output ?? res, source: 'run', console: consoleLines, error: res?.error ?? null },
      }));
      if (res?.error) toast.error('Step failed: ' + res.error);
      else toast.success('Step ran — its output is now available to the next node');
    } catch (e) {
      toast.error('Step test failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      if (testId) {
        activeTestRef.current = null;
        setNodeWait(null);
      }
      setNodeTesting(false);
    }
  }, [selectedNode, selectedPulse, handleSimulateTrigger, accumulatedVars]);

  const handleNodeUpdate = useCallback(
    (nodeId: string, updatedData: Record<string, any>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n)));
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data: updatedData } : prev));
    },
    [setNodes],
  );

  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => layoutNodes(nds, edges));
  }, [edges, setNodes]);

  const handleApplyAIWorkflow = useCallback(
    (workflow: WorkflowDefinition, meta?: { name?: string; entity?: string }) => {
      const flow = definitionToFlow(workflow);
      // A flow starts with its trigger; one without can never run, so it is not put on the canvas.
      if (!flow.nodes.some((n) => n.type === 'trigger')) {
        toast.error('The assistant returned steps without a trigger, so nothing was applied. Ask it to say what starts the workflow.');
        return;
      }
      setNodes(layoutNodes(seedDefaults(flow.nodes), flow.edges));
      setEdges(flow.edges);
      // The header fields are part of the result too: a name the assistant chose, and the entity
      // the trigger starts from. Only filled when empty — never over a person's own values.
      if (!workflowName.trim() && meta?.name) setWorkflowName(meta.name);
      // The assistant names the entity explicitly; a manual-start trigger also carries it in its
      // config, while update/create/delete triggers do not (they listen to the header's entity).
      const trigger = (workflow.nodes || []).find((n: any) => n.kind === 'trigger' || String(n.type || '').startsWith('trigger.'));
      const entity = (meta?.entity && String(meta.entity).trim()) || (trigger?.config as any)?.entity;
      if (!workflowEntity.trim() && typeof entity === 'string' && entity) setWorkflowEntity(entity);
      toast.success('Workflow applied from AI');
    },
    [setNodes, setEdges, workflowName, workflowEntity, seedDefaults],
  );

  const savedExists = !isNew || !!workflowIdRef.current;

  // ── Version history ────────────────────────────────────────────────────────────────────────────
  // Every save that changes the steps is a version. Viewing one swaps it onto the canvas read-only;
  // the steps being edited are kept aside and come back on "Back to current", unsaved edits included.
  // Restoring saves the old steps as a NEW version, so it can itself be undone.
  const canRollback = useCan('Workflow', 'action:rollback');
  const [historyOpen, setHistoryOpen] = useState(searchParams.get('history') === '1');
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [preview, setPreview] = useState<(WorkflowVersion & { definition: WorkflowDefinition }) | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const draftRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const showFlow = useCallback(
    (definition: WorkflowDefinition | null | undefined) => {
      const flow = definitionToFlow(definition);
      const shown = isTopToBottomLayout(flow.nodes, flow.edges) ? layoutNodes(flow.nodes, flow.edges) : flow.nodes;
      setNodes(shown);
      setEdges(flow.edges);
      return { nodes: shown, edges: flow.edges };
    },
    [setNodes, setEdges],
  );

  const previewVersion = useCallback(
    async (v: WorkflowVersion) => {
      const wid = workflowIdRef.current;
      if (!wid) return;
      try {
        const full = await workflowService.version(wid, v.id);
        if (!full?.definition) {
          toast.error('Version ' + v.version + ' has no steps to show.');
          return;
        }
        if (!draftRef.current) draftRef.current = { nodes, edges };
        setSelectedNode(null);
        showFlow(full.definition);
        setPreview({ ...full, definition: full.definition });
      } catch {
        toast.error('Could not open version ' + v.version);
      }
    },
    [nodes, edges, showFlow],
  );

  const exitPreview = useCallback(() => {
    if (draftRef.current) {
      setNodes(draftRef.current.nodes);
      setEdges(draftRef.current.edges);
    }
    draftRef.current = null;
    setPreview(null);
  }, [setNodes, setEdges]);

  const restorePreview = useCallback(async () => {
    const wid = workflowIdRef.current;
    if (!wid || !preview) return;
    setRestoring(true);
    try {
      await workflowService.rollback(wid, preview.id);
      const wf = await workflowService.getOne(wid);
      const restored = showFlow(wf.definition);
      setSavedKey(savedFingerprint(wf.name || '', wf.entityName || '', restored.nodes, restored.edges));
      setCurrentVersion(typeof wf.version === 'number' ? wf.version : null);
      setWorkflowStatus(wf.status || 'DRAFT');
      toast.success('Restored version ' + preview.version + (typeof wf.version === 'number' ? ' — saved as version ' + wf.version : ''));
      draftRef.current = null;
      setPreview(null);
      setConfirmRestore(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not restore this version');
    } finally {
      setRestoring(false);
    }
  }, [preview, showFlow]);

  // ── Unsaved changes ────────────────────────────────────────────────────────────────────────────
  // Save is offered only when the canvas differs from what was last saved (or was never saved).
  const isDirty = useMemo(() => {
    // While a saved version is previewed, the edits in progress are the ones kept aside.
    const src = preview ? draftRef.current : { nodes, edges };
    if (!src) return false;
    const now = savedFingerprint(workflowName, workflowEntity, src.nodes, src.edges);
    return savedKey === null ? src.nodes.length > 0 || workflowName.trim() !== '' : now !== savedKey;
  }, [preview, workflowName, workflowEntity, nodes, edges, savedKey]);
  // Read by Test flow (declared above this), which says when it ran unsaved changes.
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty;

  // Leaving the editor (its back arrow, the sidebar, the browser's Back) with unsaved changes asks
  // first: save and leave, discard, or stay. Closing or reloading the tab gets the browser's own
  // prompt (below); a page cannot show its own dialog there.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leaveOkRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const [leaveSaving, setLeaveSaving] = useState(false);

  const discardAndLeave = useCallback(() => {
    leaveOkRef.current = true;
    blockerRef.current.proceed?.();
  }, []);

  const saveAndLeave = useCallback(async () => {
    const next = blockerRef.current.location;
    setLeaveSaving(true);
    const ok = await handleSave();
    setLeaveSaving(false);
    if (!ok) {
      // The save was refused (the toasts say why): stay, so it can be fixed.
      blockerRef.current.reset?.();
      return;
    }
    leaveOkRef.current = true;
    if (blockerRef.current.state === 'blocked') blockerRef.current.proceed?.();
    else if (next) navigate(next.pathname + next.search + next.hash);
  }, [handleSave, navigate]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // Deep link from a run ("ran on v3"): /workflows/:id?version=3 opens the history on that version.
  const versionParam = searchParams.get('version');
  const deepLinked = useRef(false);
  useEffect(() => {
    if (loading || deepLinked.current || !versionParam || !workflowIdRef.current) return;
    deepLinked.current = true;
    setHistoryOpen(true);
    workflowService
      .versions(workflowIdRef.current)
      .then((list) => {
        const v = list.find((x) => String(x.version) === versionParam);
        if (!v) toast.warning('Version ' + versionParam + ' of this workflow was not found.');
        else if (v.version !== currentVersion) previewVersion(v);
      })
      .catch(() => undefined);
  }, [loading, versionParam, currentVersion, previewVersion]);

  // Every step, Manual Start included, opens its settings (Manual Start has some: where it is started
  // from, the table, and "Allowed when"). Running it is the ▶ beside its tile (n8n's "execute"):
  // a test run on the record already picked, or the run dialog to pick one.
  const handleNodeSelect = useCallback((node: Node | null) => setSelectedNode(node), []);

  // Saved or not: an unsaved canvas is tested as it is, so a design can be run while it is unfinished.
  const runManual = useCallback(() => {
    if (running || preview) return;
    let hasRecord = false;
    try {
      const ctx = JSON.parse(testContext || '{}');
      hasRecord = !!ctx && typeof ctx === 'object' && Object.keys(ctx).length > 0;
    } catch {
      hasRecord = false;
    }
    if (hasRecord) runFlow();
    else {
      setTestOpen(true);
      toast.message('Pick the record to start the workflow with, then press Run Test.');
    }
  }, [running, preview, savedExists, testContext, runFlow]);

  // "Execute previous steps" from a step's window: runs what leads to it, stopping before it.
  const runPrevious = useCallback(
    (nodeId: string) => {
      if (running || preview) return;
      let hasRecord = false;
      try {
        const ctx = JSON.parse(testContext || '{}');
        hasRecord = !!ctx && typeof ctx === 'object' && Object.keys(ctx).length > 0;
      } catch {
        hasRecord = false;
      }
      if (hasRecord) runFlowFrom(nodeId);
      else {
        // Pick the record to start with first; Run Test then runs up to this step.
        pendingUpTo.current = nodeId;
        setTestOpen(true);
      }
    },
    [running, preview, savedExists, testContext, runFlowFrom],
  );

  useEffect(() => {
    const onRun = () => runManual();
    window.addEventListener('pulse:run-manual', onRun);
    return () => window.removeEventListener('pulse:run-manual', onRun);
  }, [runManual]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusCls =
    workflowStatus === 'ACTIVE'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : workflowStatus === 'INACTIVE'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'border-border bg-muted text-muted-foreground';



  // Every human.userTask node with its declared form fields, so the Test dialog can ask for the
  // answers up front (e.g. decision = approve).
  // The trigger, for the Test dialog: a webhook, schedule or sign-up picks its input in its own
  // panel (last real run, or a typed sample); a record trigger picks a row.
  const triggerNode = nodes.find((n) => n.type === 'trigger');
  const triggerNodeData = ((triggerNode?.data as any) || {}) as Record<string, any>;
  const triggerType = String(triggerNodeData.triggerType || triggerNodeData.pulseType || '');
  const triggerSpec = findManifestEntry(catalog?.pulses, triggerType)?.meta.triggerInput;
  const triggerHasPanel = !!triggerNode && !!triggerSpec && triggerSpec.source !== 'record';

  const userTaskNodes = nodes
    .filter((n) => ((n.data as any) || {}).actionType === 'human.userTask')
    .map((n) => {
      const d = (n.data as any) || {};
      const form: any[] = Array.isArray(d.config?.form) ? d.config.form : [];
      const fields: Array<{ key: string; label: string; type: string }> = form
        .filter((f) => f && typeof f.key === 'string' && f.key)
        .map((f) => ({ key: String(f.key), label: String(f.label || f.key), type: String(f.type || 'text') }));
      return { id: n.id, label: String(d.label || n.id), fields };
    });

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/30">
      {/* Canvas fills the modeler; every control floats above it for shell consistency. With the
          version history open it stops where the panel starts, so no step hides behind it. */}
      <div className={cn('absolute inset-y-0 left-0 transition-[right] duration-200', historyOpen ? 'right-[calc(min(20rem,100%-1.5rem)+0.75rem)]' : 'right-0')}>
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeSelect={preview ? (node) => setSelectedNode(node) : handleNodeSelect}
          readOnly={!!preview}
          fitKey={(preview ? 'v' + preview.version : 'current') + (historyOpen ? ':panel' : '')}
          onAddTrigger={() => {
            setAddAfter(null);
            setHistoryOpen(false);
            setPaletteOpen(true);
          }}
        />
      </div>

      {/* Floating toolbar */}
      <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/automation/workflows')} title="Back to list">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name..."
          className="h-8 w-52 text-[13px]"
        />
        {/* Other active workflows on the same trigger: a small marker, the sentence and the run
            order on hover/focus — a full-width banner took the toolbar's room. */}
        {fanOut && fanOut.count > 0 ? (
          <span
            role="img"
            tabIndex={0}
            aria-label={
              fanOut.count + ' other active workflow' + (fanOut.count === 1 ? '' : 's') + ' on ' + workflowEntity +
              ' also run' + (fanOut.count === 1 ? 's' : '') + ' on this trigger — ' + fanOut.order
            }
            title={
              fanOut.count + ' other active workflow' + (fanOut.count === 1 ? '' : 's') + ' also run' + (fanOut.count === 1 ? 's' : '') +
              ' on this trigger — ' + fanOut.order + '\n' + fanOut.workflows.map((w, i) => (i + 1) + '. ' + w.name).join('\n')
            }
            className="inline-flex h-8 shrink-0 cursor-help items-center gap-1 rounded-md px-1.5 text-[12px] font-medium tabular-nums text-amber-600 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-400"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />+{fanOut.count}
          </span>
        ) : null}
        {ENTITIES.length > 0 ? (
          <Select value={workflowEntity} onValueChange={setWorkflowEntity}>
            <SelectTrigger className="h-8 w-44 text-[13px]">
              <SelectValue placeholder="Target entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={workflowEntity}
            onChange={(e) => setWorkflowEntity(e.target.value)}
            placeholder="Target entity (e.g. Order)"
            className="h-8 w-44 text-[13px]"
          />
        )}
        <Badge variant="outline" className={cn('text-[11px] font-semibold', statusCls)}>
          {workflowStatus}
        </Badge>
        {inspectedRun ? (
          <Badge variant="secondary" className="text-[11px]" title={'Run ' + inspectedRun.id}>
            Viewing run {inspectedRun.id.slice(0, 8)} · {inspectedRun.status}
          </Badge>
        ) : null}

        <div className="flex-1" />

        {/* Version history: the current version number doubles as the way in. */}
        <Button
          variant={historyOpen ? 'secondary' : 'outline'}
          size="sm"
          className="h-8"
          onClick={() => {
            setHistoryOpen((o) => !o);
            setPaletteOpen(false);
          }}
          disabled={!savedExists}
          aria-pressed={historyOpen}
          title="Version history"
        >
          <History className="mr-1.5 h-3.5 w-3.5" /> {currentVersion != null ? 'v' + currentVersion : 'History'}
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={handleAutoLayout} disabled={!!preview}>
          <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Auto Layout
        </Button>
        {/* Export what is on the canvas now, unsaved edits included, as a file another app can import. */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          title="Export as a file"
          disabled={nodes.length === 0}
          onClick={() =>
            downloadWorkflowFile({
              name: workflowName.trim() || 'Untitled workflow',
              entityName: workflowEntity.trim(),
              definition: flowToDefinition(nodes, edges),
            })
          }
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export
        </Button>
        {running ? (
          <Button variant="outline" size="sm" className="h-8" onClick={stopTest} title="Stop the test run">
            <Square className="mr-1.5 h-3 w-3" fill="currentColor" /> Stop
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8" onClick={() => setTestOpen(true)} disabled={!!preview}>
            <Play className="mr-1.5 h-3.5 w-3.5" /> Test
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', workflowStatus === 'ACTIVE' && 'text-emerald-600 dark:text-emerald-400')}
          onClick={handleToggleActive}
          disabled={
            !savedExists || !!preview || (workflowStatus === 'ACTIVE' ? !canDeactivate : !canActivate)
          }
          title={workflowStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        >
          <Power className="h-4 w-4" />
        </Button>
        {isDirty && !saving ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-amber-700 dark:text-amber-400" role="status">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
          </span>
        ) : null}
        <Button size="sm" className={'h-8 min-w-[80px]' + (justSaved ? ' bg-emerald-600 text-white hover:bg-emerald-600' : '')} onClick={() => void handleSave()} disabled={saving || !!preview || (!isDirty && !justSaved)} title={!isDirty && !justSaved && !preview ? 'No changes to save' : undefined}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : justSaved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          {saving ? 'Saving...' : justSaved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {/* Components: hidden by default, revealed via a floating "+" (n8n-style) */}
      {historyOpen || preview ? null : !paletteOpen ? (
        <button
          onClick={() => setPaletteOpen(true)}
          title="Add components"
          aria-label="Add components"
          className="absolute right-3 top-[72px] z-20 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-foreground shadow-lg transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      ) : (
        <div className="absolute bottom-3 right-3 top-[72px] z-20 w-72">
          <NodePalette
            stage={nodes.some((n) => n.type === 'trigger') ? 'steps' : 'trigger'}
            addAfter={addAfter}
            onCancelAddAfter={() => setAddAfter(null)}
            onClose={() => {
              setPaletteOpen(false);
              setAddAfter(null);
            }}
          />
        </div>
      )}

      {/* Pulse configuration: the full-screen node detail modal (INPUT /
          PARAMETERS / OUTPUT). Replaces the old side inspector, so the canvas is
          never squeezed by a config panel. */}
      {selectedNode && selectedPulse ? (
        <PulseNodeModal
          node={selectedNode as { id: string; data?: Record<string, unknown> }}
          pulse={selectedPulse}
          onUpdate={preview ? () => undefined : handleNodeUpdate}
          readOnly={!!preview}
          onClose={() => setSelectedNode(null)}
          steps={modalSteps}
          directPrevId={directPrevId}
          isTrigger={selectedPulse.meta.category === 'trigger'}
          targetEntity={workflowEntity}
          testOutput={selectedNode ? nodeOutputs[selectedNode.id]?.output : undefined}
          loopRuns={selectedNode ? nodeOutputs[selectedNode.id]?.runs : undefined}
          outputSource={
            selectedNode && nodeOutputs[selectedNode.id]?.source && nodeOutputs[selectedNode.id]?.source !== 'run'
              ? (nodeOutputs[selectedNode.id]?.source as 'real' | 'generated' | 'lastRun' | 'sample')
              : null
          }
          outputAt={selectedNode ? nodeOutputs[selectedNode.id]?.at : undefined}
          testConsole={selectedNode ? nodeOutputs[selectedNode.id]?.console : undefined}
          testError={selectedNode ? nodeOutputs[selectedNode.id]?.error : undefined}
          workflowId={workflowIdRef.current}
          workflowActive={workflowStatus === 'ACTIVE'}
          onUseTriggerInput={(res) => {
            if (!selectedNode) return;
            if (applyTriggerInput(selectedNode.id, res))
              toast.success(res.from === 'lastRun' ? 'Loaded the input of the last real run' : 'Simulated with your sample');
          }}
          testing={nodeTesting}
          testWait={nodeTesting ? nodeWait : null}
          simulating={nodeTesting}
          onSimulate={handleSimulateTrigger}
          onTestNode={handleTestNode}
          // Only a step something leads into has "previous steps" to run: offered nowhere else.
          onRunPrevious={edges.some((e) => e.target === selectedNode.id) ? () => runPrevious(selectedNode.id) : undefined}
          runningPrevious={running}
        />
      ) : null}

      {/* Version history, docked on the right like the components panel */}
      {historyOpen && workflowIdRef.current ? (
        <div className="absolute bottom-3 right-3 top-[72px] z-20 w-[min(20rem,calc(100%-1.5rem))]">
          <WorkflowVersionHistory
            workflowId={workflowIdRef.current}
            currentVersion={currentVersion}
            previewingId={preview?.id ?? null}
            onPreview={previewVersion}
            onExitPreview={exitPreview}
            onClose={() => {
              setHistoryOpen(false);
              exitPreview();
            }}
          />
        </div>
      ) : null}

      {/* Viewing an old version: say so over the canvas, with the two ways out */}
      {preview ? (
        <div
          role="status"
          className={cn(
            'absolute top-[72px] z-30 rounded-xl border border-primary/30 bg-card/95 px-4 py-3 shadow-lg backdrop-blur',
            historyOpen ? 'left-3 right-[calc(min(20rem,100%-1.5rem)+1.25rem)]' : 'left-3 right-3',
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <History className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Viewing version {preview.version} · read-only</p>
              <p className="text-xs text-muted-foreground">
                {preview.createdAt ? 'Saved ' + new Date(preview.createdAt).toLocaleString() : ''}
                {preview.createdBy ? ' by ' + preview.createdBy : ''}
                {' · Restoring it: '}
                {describeDifference(
                  draftRef.current ? flowToDefinition(draftRef.current.nodes, draftRef.current.edges) : null,
                  preview.definition,
                ).toLowerCase()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={exitPreview}>
                Back to current
              </Button>
              <Button
                size="sm"
                className="h-8"
                onClick={() => setConfirmRestore(true)}
                disabled={!canRollback}
                title={canRollback ? undefined : 'You do not have permission to restore versions'}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore this version
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={confirmRestore} onOpenChange={(o) => !restoring && setConfirmRestore(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore version {preview?.version}?</DialogTitle>
            <DialogDescription>
              Its steps replace the current ones and are saved as version {(currentVersion ?? 0) + 1}. Nothing is
              deleted: version {currentVersion} stays in the history and can be restored the same way.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Runs already in progress finish on the version they started with.</li>
            <li>
              {workflowStatus === 'ACTIVE'
                ? 'This workflow is active, so new runs use the restored steps straight away.'
                : 'New runs use the restored steps once the workflow is active.'}
            </li>
            <li>Changes on the canvas that you have not saved are discarded.</li>
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRestore(false)} disabled={restoring}>
              Cancel
            </Button>
            <Button onClick={restorePreview} disabled={restoring}>
              {restoring ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
              Restore version {preview?.version}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaving with unsaved changes */}
      <Dialog open={blocker.state === 'blocked'} onOpenChange={(o) => !o && !leaveSaving && blocker.reset?.()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>You changed this workflow since it was last saved.</DialogDescription>
          </DialogHeader>
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <p className="text-foreground">
              <span className="font-semibold">Discarding throws away every change since your last save</span> — steps,
              connections and settings. This cannot be undone.
            </p>
          </div>
          {preview ? (
            <p className="text-sm text-muted-foreground">
              You are viewing an old version. To keep your changes, choose Keep editing, then Back to current and Save.
            </p>
          ) : null}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:space-x-0">
            <Button variant="outline" onClick={() => blocker.reset?.()} disabled={leaveSaving}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={discardAndLeave} disabled={leaveSaving}>
              Discard changes
            </Button>
            {preview ? null : (
              <Button onClick={saveAndLeave} disabled={leaveSaving}>
                {leaveSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Save and leave
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Build with AI — designs this workflow from a description (opened from the toolbar). */}
      <WorkflowAIPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onApplyWorkflow={handleApplyAIWorkflow}
        currentWorkflow={nodes.length > 0 ? flowToDefinition(nodes, edges) : null}
      />
      {/* Build with AI: an icon button in the canvas's bottom-right corner — a design tool for THIS
          workflow (Ask, in the top bar, answers about data). Out of the way while a side panel
          (components, history) owns that edge, or a saved version is being viewed. */}
      {aiPanelOpen || paletteOpen || historyOpen || preview ? null : (
        <button
          type="button"
          onClick={() => setAiPanelOpen(true)}
          title="Build with AI — describe the process and let AI draw or change this workflow"
          aria-label="Build with AI"
          className="absolute bottom-5 right-5 z-20 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </button>
      )}

      {/* Test dialog */}
      <Dialog
        open={testOpen}
        onOpenChange={(o) => {
          setTestOpen(o);
          if (!o) pendingUpTo.current = null;
        }}
      >
        {/* Above a step's window (z-60): "Execute previous steps" opens this from inside one. */}
        <DialogContent className="z-[70]">
          <DialogHeader>
            <DialogTitle>Test Workflow</DialogTitle>
            <DialogDescription>
              Choose the trigger data, then run — the test plays out on the canvas, and every node's input &amp; output is saved so you can open any node to inspect it.
            </DialogDescription>
          </DialogHeader>
          {triggerHasPanel && triggerNode && triggerSpec ? (
            <TriggerInputPanel
              spec={triggerSpec}
              triggerType={triggerType}
              config={(triggerNodeData.config ?? {}) as Record<string, unknown>}
              onConfigChange={(patch) =>
                handleNodeUpdate(triggerNode.id, { ...triggerNodeData, config: { ...(triggerNodeData.config ?? {}), ...patch } })
              }
              workflowId={workflowIdRef.current}
              workflowActive={workflowStatus === 'ACTIVE'}
              mode="test"
              onUse={(res) => {
                if (!res?.data) return;
                setTestContext(JSON.stringify(res.data));
                setTestFrom(res.from === 'lastRun' ? 'lastRun' : 'sample');
              }}
              usedFrom={testFrom}
            />
          ) : (
            <TriggerSampleField
              entity={workflowEntity}
              value={testContext}
              onChange={setTestContext}
            />
          )}
          {userTaskNodes.length > 0 ? (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                This workflow has {userTaskNodes.length} user task{userTaskNodes.length === 1 ? '' : 's'}. Fill in the answers so the test can continue past each one.
              </p>
              {userTaskNodes.map((t) => (
                <div key={t.id} className="space-y-2 rounded-md border border-border p-2">
                  <p className="text-[12px] font-semibold">{t.label}</p>
                  {t.fields.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No fields — the task is completed as-is.</p>
                  ) : (
                    t.fields.map((f) => (
                      <div key={f.key} className="flex items-center gap-2">
                        <label className="w-32 shrink-0 truncate text-[12px]" htmlFor={'ta-' + t.id + '-' + f.key} title={f.key}>
                          {f.label}
                        </label>
                        <Input
                          id={'ta-' + t.id + '-' + f.key}
                          className="h-8 text-[12px]"
                          placeholder={f.key === 'decision' ? 'approve' : f.type}
                          value={String(taskAnswers[t.id]?.[f.key] ?? '')}
                          onChange={(e) =>
                            setTaskAnswers((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? {}), [f.key]: e.target.value } }))
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runFlow} disabled={running}>
              {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              {running ? 'Running...' : 'Run Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

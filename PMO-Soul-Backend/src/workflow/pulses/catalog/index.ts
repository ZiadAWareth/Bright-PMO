import { type Pulse, PulseRegistry } from '../core';
import { manualStartPulse } from './triggers/manual-start';
import { recordCreatedPulse } from './triggers/record-created';
import { recordUpdatedPulse } from './triggers/record-updated';
import { recordDeletedPulse } from './triggers/record-deleted';
import { scheduledPulse } from './triggers/scheduled';
import { webhookPulse } from './triggers/webhook';
// The start of a workflow another workflow calls (n8n's "When Executed by Another Workflow").
import { calledByWorkflowPulse } from './triggers/called-by-workflow';
import { setVariablePulse } from './data/set-variable';
// A designer's own function body, sandboxed (Run JavaScript).
import { runCodePulse } from './data/run-code';
// Copy / rename / combine values into variables, no code (Map Fields).
import { mapPulse } from './data/map';
import { evaluatePulse } from './control/evaluate';
import { exclusiveGatewayPulse } from './control/exclusive-gateway';
import { logPulse } from './control/log';
import { endSuccessPulse } from './control/end-success';
import { endErrorPulse } from './control/end-error';
// Wave 2 — data plane
import { createRecordPulse } from './data/create-record';
// Identity — the one step that may create a login (sign-up processes).
import { createUserPulse } from './data/create-user';
import { readRecordPulse } from './data/read-record';
import { updateRecordPulse } from './data/update-record';
import { deleteRecordPulse } from './data/delete-record';
import { queryRecordsPulse } from './data/query-records';
import { transitionStatePulse } from './data/transition-state';
import { randomIdPulse } from './data/random-id';
import { validatePulse } from './control/validate';
// Wave 3 — concurrency
import { switchPulse } from './control/switch';
import { parallelSplitPulse } from './control/parallel-split';
import { parallelJoinPulse } from './control/parallel-join';
import { inclusiveGatewayPulse } from './control/inclusive-gateway';
import { forEachPulse } from './control/for-each';
import { whileLoopPulse } from './control/while-loop';
// Wave 4 — time, waiting & errors
import { waitPulse } from './time/wait';
import { throwErrorPulse } from './control/throw-error';
import { terminatePulse } from './control/terminate';
import { callWorkflowPulse } from './control/call-workflow';
// Integration
import { httpRequestPulse } from './integration/http-request';
// An action of a connected outside system (Activepieces pieces, enabled per app).
import { connectorPulse } from './integration/connector';
import { appApiPulse } from './integration/app-api';
import { sendEmailPulse } from './integration/send-email';
import { inAppNotificationPulse } from './integration/in-app-notification';
// Human — tasks
import { userTaskPulse } from './human/user-task';
// Intelligence — configured agents as workflow steps
import { aiAgentPulse } from './ai/agent';

export {
  manualStartPulse,
  recordCreatedPulse,
  recordUpdatedPulse,
  recordDeletedPulse,
  scheduledPulse,
  webhookPulse,
  calledByWorkflowPulse,
  createUserPulse,
  sendEmailPulse,
  inAppNotificationPulse,
  setVariablePulse,
  runCodePulse,
  mapPulse,
  evaluatePulse,
  exclusiveGatewayPulse,
  logPulse,
  endSuccessPulse,
  endErrorPulse,
  createRecordPulse,
  readRecordPulse,
  updateRecordPulse,
  deleteRecordPulse,
  queryRecordsPulse,
  transitionStatePulse,
  randomIdPulse,
  validatePulse,
  switchPulse,
  parallelSplitPulse,
  parallelJoinPulse,
  inclusiveGatewayPulse,
  forEachPulse,
  whileLoopPulse,
  waitPulse,
  throwErrorPulse,
  terminatePulse,
  httpRequestPulse,
  appApiPulse,
  connectorPulse,
  userTaskPulse,
  aiAgentPulse,
};

/** Entity + schedule + webhook triggers (pulse-engine equivalents of the legacy triggers). */
export const TRIGGER_PULSES: Pulse[] = [
  recordCreatedPulse,
  recordUpdatedPulse,
  recordDeletedPulse,
  scheduledPulse,
  webhookPulse,
  calledByWorkflowPulse,
];

/** Wave 1 — the walking-skeleton pulses. */
export const WAVE_1_PULSES: Pulse[] = [
  manualStartPulse,
  setVariablePulse,
  evaluatePulse,
  exclusiveGatewayPulse,
  logPulse,
  endSuccessPulse,
  endErrorPulse,
];

/** Wave 2 — the data plane. */
export const WAVE_2_PULSES: Pulse[] = [
  createRecordPulse,
  readRecordPulse,
  updateRecordPulse,
  deleteRecordPulse,
  queryRecordsPulse,
  transitionStatePulse,
  randomIdPulse,
  validatePulse,
  runCodePulse,
  mapPulse,
];

/** Wave 3 — concurrency (gateways + loops). */
export const WAVE_3_PULSES: Pulse[] = [
  switchPulse,
  parallelSplitPulse,
  parallelJoinPulse,
  inclusiveGatewayPulse,
  forEachPulse,
  whileLoopPulse,
];

/** Wave 4 — time, waiting & errors. */
export const WAVE_4_PULSES: Pulse[] = [waitPulse, throwErrorPulse, terminatePulse, callWorkflowPulse];

/** Integration & communication pulses (Wave 6). */
export const INTEGRATION_PULSES: Pulse[] = [
  httpRequestPulse,
  appApiPulse,
  connectorPulse,
  sendEmailPulse,
  inAppNotificationPulse,
];

/**
 * Identity — creating a login.
 *
 * Its own array, not folded into the data plane, because these pulses are the only ones that can
 * hand out access. One entry today; anything added here is reviewed as a privilege decision.
 */
export const IDENTITY_PULSES: Pulse[] = [createUserPulse];

/** Human — task pulses (Wave 5). */
export const HUMAN_PULSES: Pulse[] = [userTaskPulse];

/**
 * Intelligence (Phase 3) — steps that call a configured agent.
 *
 * One entry, and that is the design rather than a starting point: an agent is a configuration
 * row, so a hundred agents are still one node type. A second entry here would mean a second way
 * to run an agent, which is how two engines start.
 */
export const AI_PULSES: Pulse[] = [aiAgentPulse];

/** Every catalogued pulse (grows per wave). */
export const ALL_PULSES: Pulse[] = [
  ...TRIGGER_PULSES,
  ...WAVE_1_PULSES,
  ...WAVE_2_PULSES,
  ...WAVE_3_PULSES,
  ...WAVE_4_PULSES,
  ...HUMAN_PULSES,
  ...IDENTITY_PULSES,
  ...INTEGRATION_PULSES,
  ...AI_PULSES,
];

/** Build a registry with every catalogued pulse registered. */
export function buildPulseRegistry(): PulseRegistry {
  return new PulseRegistry().registerAll(ALL_PULSES);
}

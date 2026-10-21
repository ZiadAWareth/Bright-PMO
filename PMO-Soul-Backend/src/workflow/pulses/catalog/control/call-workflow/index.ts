import { definePulse } from '../../../core';
import { meta, config, io } from './call-workflow.pulse';
import { execute } from './call-workflow.executor';

export const callWorkflowPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './called-by-workflow.pulse';
import { execute } from './called-by-workflow.executor';

export const calledByWorkflowPulse = definePulse({ meta, config, io, execute });

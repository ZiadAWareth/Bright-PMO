import { definePulse } from '../../../core';
import { meta, config, io } from './agent.pulse';
import { execute } from './agent.executor';

export const aiAgentPulse = definePulse({ meta, config, io, execute });

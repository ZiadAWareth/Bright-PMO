import { definePulse } from '../../../core';
import { meta, config, io } from './manual-start.pulse';
import { execute } from './manual-start.executor';

export const manualStartPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './scheduled.pulse';
import { execute } from './scheduled.executor';

export const scheduledPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './log.pulse';
import { execute } from './log.executor';

export const logPulse = definePulse({ meta, config, io, execute });

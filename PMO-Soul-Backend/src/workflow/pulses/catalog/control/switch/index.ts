import { definePulse } from '../../../core';
import { meta, config, io } from './switch.pulse';
import { execute } from './switch.executor';

export const switchPulse = definePulse({ meta, config, io, execute });

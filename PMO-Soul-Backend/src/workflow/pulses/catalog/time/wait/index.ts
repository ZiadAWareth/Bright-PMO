import { definePulse } from '../../../core';
import { meta, config, io } from './wait.pulse';
import { execute } from './wait.executor';

export const waitPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './throw-error.pulse';
import { execute } from './throw-error.executor';

export const throwErrorPulse = definePulse({ meta, config, io, execute });

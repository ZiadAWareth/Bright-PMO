import { definePulse } from '../../../core';
import { meta, config, io } from './end-error.pulse';
import { execute } from './end-error.executor';

export const endErrorPulse = definePulse({ meta, config, io, execute });

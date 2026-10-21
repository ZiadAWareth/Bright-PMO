import { definePulse } from '../../../core';
import { meta, config, io } from './evaluate.pulse';
import { execute } from './evaluate.executor';

export const evaluatePulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './for-each.pulse';
import { execute } from './for-each.executor';

export const forEachPulse = definePulse({ meta, config, io, execute });

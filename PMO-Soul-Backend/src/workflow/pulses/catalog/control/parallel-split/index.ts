import { definePulse } from '../../../core';
import { meta, config, io } from './parallel-split.pulse';
import { execute } from './parallel-split.executor';

export const parallelSplitPulse = definePulse({ meta, config, io, execute });

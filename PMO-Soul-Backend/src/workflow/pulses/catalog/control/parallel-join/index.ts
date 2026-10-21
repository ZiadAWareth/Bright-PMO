import { definePulse } from '../../../core';
import { meta, config, io } from './parallel-join.pulse';
import { execute } from './parallel-join.executor';

export const parallelJoinPulse = definePulse({ meta, config, io, execute });

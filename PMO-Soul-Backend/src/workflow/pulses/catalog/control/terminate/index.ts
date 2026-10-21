import { definePulse } from '../../../core';
import { meta, config, io } from './terminate.pulse';
import { execute } from './terminate.executor';

export const terminatePulse = definePulse({ meta, config, io, execute });

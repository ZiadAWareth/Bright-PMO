import { definePulse } from '../../../core';
import { meta, config, io } from './run-code.pulse';
import { execute } from './run-code.executor';

export const runCodePulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './set-variable.pulse';
import { execute } from './set-variable.executor';

export const setVariablePulse = definePulse({ meta, config, io, execute });

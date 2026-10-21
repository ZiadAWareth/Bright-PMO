import { definePulse } from '../../../core';
import { meta, config, io } from './validate.pulse';
import { execute } from './validate.executor';

export const validatePulse = definePulse({ meta, config, io, execute });

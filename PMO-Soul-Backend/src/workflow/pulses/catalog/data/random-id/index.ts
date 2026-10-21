import { definePulse } from '../../../core';
import { meta, config, io } from './random-id.pulse';
import { execute } from './random-id.executor';

export const randomIdPulse = definePulse({ meta, config, io, execute });

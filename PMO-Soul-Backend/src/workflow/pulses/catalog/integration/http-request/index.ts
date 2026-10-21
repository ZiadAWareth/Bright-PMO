import { definePulse } from '../../../core';
import { meta, config, io } from './http-request.pulse';
import { execute } from './http-request.executor';

export const httpRequestPulse = definePulse({ meta, config, io, execute });

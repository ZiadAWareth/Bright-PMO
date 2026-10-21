import { definePulse } from '../../../core';
import { meta, config, io } from './app-api.pulse';
import { execute } from './app-api.executor';

export const appApiPulse = definePulse({ meta, config, io, execute });

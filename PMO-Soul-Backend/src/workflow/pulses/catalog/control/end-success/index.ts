import { definePulse } from '../../../core';
import { meta, config, io } from './end-success.pulse';
import { execute } from './end-success.executor';

export const endSuccessPulse = definePulse({ meta, config, io, execute });

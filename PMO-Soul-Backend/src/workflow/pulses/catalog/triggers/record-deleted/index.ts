import { definePulse } from '../../../core';
import { meta, config, io } from './record-deleted.pulse';
import { execute } from './record-deleted.executor';

export const recordDeletedPulse = definePulse({ meta, config, io, execute });

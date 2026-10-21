import { definePulse } from '../../../core';
import { meta, config, io } from './record-updated.pulse';
import { execute } from './record-updated.executor';

export const recordUpdatedPulse = definePulse({ meta, config, io, execute });

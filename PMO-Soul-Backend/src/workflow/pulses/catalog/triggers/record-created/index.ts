import { definePulse } from '../../../core';
import { meta, config, io } from './record-created.pulse';
import { execute } from './record-created.executor';

export const recordCreatedPulse = definePulse({ meta, config, io, execute });

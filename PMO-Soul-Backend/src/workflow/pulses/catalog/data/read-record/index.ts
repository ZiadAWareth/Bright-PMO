import { definePulse } from '../../../core';
import { meta, config, io } from './read-record.pulse';
import { execute } from './read-record.executor';

export const readRecordPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './query-records.pulse';
import { execute } from './query-records.executor';

export const queryRecordsPulse = definePulse({ meta, config, io, execute });

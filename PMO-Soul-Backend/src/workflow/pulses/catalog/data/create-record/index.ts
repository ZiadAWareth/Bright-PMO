import { definePulse } from '../../../core';
import { meta, config, io } from './create-record.pulse';
import { execute } from './create-record.executor';

export const createRecordPulse = definePulse({ meta, config, io, execute });

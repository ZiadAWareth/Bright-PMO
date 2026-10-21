import { definePulse } from '../../../core';
import { meta, config, io } from './update-record.pulse';
import { execute } from './update-record.executor';

export const updateRecordPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './delete-record.pulse';
import { execute } from './delete-record.executor';

export const deleteRecordPulse = definePulse({ meta, config, io, execute });

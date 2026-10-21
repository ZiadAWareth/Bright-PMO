import { definePulse } from '../../../core';
import { meta, config, io } from './user-task.pulse';
import { execute } from './user-task.executor';

export const userTaskPulse = definePulse({ meta, config, io, execute });

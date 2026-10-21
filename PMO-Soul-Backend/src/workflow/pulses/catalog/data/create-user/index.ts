import { definePulse } from '../../../core';
import { meta, config, io } from './create-user.pulse';
import { execute } from './create-user.executor';

export const createUserPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './webhook.pulse';
import { execute } from './webhook.executor';

export const webhookPulse = definePulse({ meta, config, io, execute });

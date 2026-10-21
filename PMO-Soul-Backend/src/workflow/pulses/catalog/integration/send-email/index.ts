import { definePulse } from '../../../core';
import { meta, config, io } from './send-email.pulse';
import { execute } from './send-email.executor';

export const sendEmailPulse = definePulse({ meta, config, io, execute });

import { definePulse } from '../../../core';
import { meta, config, io } from './exclusive-gateway.pulse';
import { execute } from './exclusive-gateway.executor';

export const exclusiveGatewayPulse = definePulse({ meta, config, io, execute });

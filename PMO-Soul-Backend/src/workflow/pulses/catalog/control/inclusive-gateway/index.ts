import { definePulse } from '../../../core';
import { meta, config, io } from './inclusive-gateway.pulse';
import { execute } from './inclusive-gateway.executor';

export const inclusiveGatewayPulse = definePulse({ meta, config, io, execute });

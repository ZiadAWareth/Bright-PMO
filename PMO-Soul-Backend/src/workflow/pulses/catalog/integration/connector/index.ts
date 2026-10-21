import { definePulse } from '../../../core';
import { meta, config, io } from './connector.pulse';
import { execute } from './connector.executor';

export const connectorPulse = definePulse({ meta, config, io, execute });

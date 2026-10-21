import { definePulse } from '../../../core';
import { meta, config, io } from './map.pulse';
import { execute } from './map.executor';

export const mapPulse = definePulse({ meta, config, io, execute });

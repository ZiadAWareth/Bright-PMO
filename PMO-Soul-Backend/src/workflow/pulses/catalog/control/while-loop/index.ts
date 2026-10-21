import { definePulse } from '../../../core';
import { meta, config, io } from './while-loop.pulse';
import { execute } from './while-loop.executor';

export const whileLoopPulse = definePulse({ meta, config, io, execute });

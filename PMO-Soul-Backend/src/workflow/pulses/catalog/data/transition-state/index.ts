import { definePulse } from '../../../core';
import { meta, config, io } from './transition-state.pulse';
import { execute } from './transition-state.executor';

export const transitionStatePulse = definePulse({ meta, config, io, execute });

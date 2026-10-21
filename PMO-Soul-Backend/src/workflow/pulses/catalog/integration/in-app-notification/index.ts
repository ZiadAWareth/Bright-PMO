import { definePulse } from '../../../core';
import { meta, config, io } from './in-app-notification.pulse';
import { execute } from './in-app-notification.executor';

export const inAppNotificationPulse = definePulse({ meta, config, io, execute });

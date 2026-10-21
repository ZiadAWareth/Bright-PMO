import { Module } from '@nestjs/common';
import { ApisIntrospectorService } from './apis-introspector.service';
import { ApisIntrospectorController } from './apis-introspector.controller';

@Module({
  providers: [ApisIntrospectorService],
  controllers: [ApisIntrospectorController],
})
export class ApisIntrospectorModule {}
